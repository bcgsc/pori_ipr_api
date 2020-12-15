const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const router = express.Router({mergeParams: true});

const Acl = require('../middleware/acl');
const db = require('../models');
const logger = require('../log');
const {uploadImage} = require('../libs/image');

const schemaGenerator = require('../schemas/schemaGenerator');
const validateAgainstSchema = require('../libs/validateAgainstSchema');
const {BASE_EXCLUDE} = require('../schemas/exclude');

const {
  DEFAULT_HEADER_HEIGHT, DEFAULT_HEADER_WIDTH, DEFAULT_LOGO_HEIGHT, DEFAULT_LOGO_WIDTH,
} = require('../constants');

// Generate schema's
const createSchema = schemaGenerator(db.models.template, {
  baseUri: '/create', exclude: [...BASE_EXCLUDE, 'logoId', 'headerId'],
});
const updateSchema = schemaGenerator(db.models.template, {
  baseUri: '/update', exclude: [...BASE_EXCLUDE, 'logoId', 'headerId'], nothingRequired: true,
});

// All template routes are admin only
router.use((req, res, next) => {
  const access = new Acl(req);
  if (!access.isAdmin()) {
    logger.error(`Only admins are allowed to access template routes User: ${req.user.username} is not an admin`);
    return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: 'Only admins are allowed to access template routes'}});
  }
  return next();
});

// Middleware for templates
router.param('template', async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.template.findOne({
      where: {ident},
      include: [
        {as: 'logoImage', model: db.models.image.scope('public')},
        {as: 'headerImage', model: db.models.image.scope('public')},
      ],
    });
  } catch (error) {
    logger.error(`Error while finding template ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while finding template'}});
  }

  if (!result) {
    logger.error(`Unable to find template with ident: ${ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: `Unable to find template with ident: ${ident}`}});
  }

  // Add template to request
  req.template = result;
  return next();
});

// Handle requests for template by ident
router.route('/:template([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.template.view('public'));
  })
  .put(async (req, res) => {
    // Validate request against schema
    try {
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (error) {
      const message = `Error while validating template update request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Check if new template name is already taken
    if (req.body.name && req.body.name !== req.template.name) {
      let updateName;
      try {
        updateName = await db.models.template.findOne({where: {name: req.body.name}});
      } catch (error) {
        logger.error(`Error while trying to update template name ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to update template name'}});
      }
  
      if (updateName) {
        logger.error(`The template name "${req.body.name}" already exists`);
        return res.status(HTTP_STATUS.CONFLICT).json({error: {message: `The template name "${req.body.name}" already exists`}});
      }
    }

    // Create transaction
    const transaction = await db.transaction();

    // Check for logo image
    if (req.files && req.files.logo) {
      const {files: {logo}} = req;
      // Upload logo image
      try {
        const logoImage = await uploadImage({
          data: logo.data,
          filename: logo.name,
          format: logo.mimetype,
          height: DEFAULT_LOGO_HEIGHT,
          width: DEFAULT_LOGO_WIDTH,
          type: 'Logo',
        }, {transaction});
        req.body.logoId = logoImage.id;
      } catch (error) {
        await transaction.rollback();
        logger.error(`Error while uploading template logo ${error}`);
        return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Error while uploading template logo'}});
      }
    }

    // Check for header image
    if (req.files && req.files.header) {
      const {files: {header}} = req;
      // Upload header image
      try {
        const headerImage = await uploadImage({
          data: header.data,
          filename: header.name,
          format: header.mimetype,
          height: DEFAULT_HEADER_HEIGHT,
          width: DEFAULT_HEADER_WIDTH,
          type: 'Header',
        }, {transaction});
        req.body.headerId = headerImage.id;
      } catch (error) {
        await transaction.rollback();
        logger.error(`Error while uploading template header ${error}`);
        return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Error while uploading template header'}});
      }
    }


    // Update db entry
    try {
      await req.template.update(req.body, {transaction});
      await req.template.reload({transaction});
      await transaction.commit();
      return res.json(req.template.view('public'));
    } catch (error) {
      await transaction.rollback();
      logger.error(`Unable to update template ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update template burden'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete template
    try {
      await req.template.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while removing template ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while removing template'}});
    }
  });

// Handle requests for templates
router.route('/')
  .get(async (req, res) => {
    const {query: {name, organization}} = req;
    const opts = {
      where: {
        ...((name) ? {name: {[Op.iLike]: `%${name}%`}} : {}),
        ...((organization) ? {organization: {[Op.iLike]: `%${organization}%`}} : {}),
      },
    };

    try {
      const results = await db.models.template.scope('public').findAll(opts);
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to lookup templates error: ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to lookup templates'}});
    }
  })
  .post(async (req, res) => {
    // Validate request against schema
    try {
      await validateAgainstSchema(createSchema, req.body);
    } catch (error) {
      const message = `Error while validating template create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Check if template name is already taken
    let nameCheck;
    try {
      nameCheck = await db.models.template.findOne({where: {name: req.body.name}});
    } catch (error) {
      logger.error(`Error while trying to check template name ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to check template name'}});
    }

    if (nameCheck) {
      logger.error(`The template name "${req.body.name}" already exists`);
      return res.status(HTTP_STATUS.CONFLICT).json({error: {message: `The template name "${req.body.name}" already exists`}});
    }

    // Create transaction
    const transaction = await db.transaction();

    // Check for logo image
    let logoImage;
    if (req.files && req.files.logo) {
      const {files: {logo}} = req;
      try {
        logoImage = await uploadImage({
          data: logo.data,
          filename: logo.name,
          format: logo.mimetype,
          height: DEFAULT_LOGO_HEIGHT,
          width: DEFAULT_LOGO_WIDTH,
          type: 'Logo',
        }, {transaction});
        req.body.logoId = logoImage.id;
      } catch (error) {
        await transaction.rollback();
        logger.error(`Error while trying to upload logo ${error}`);
        return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Error while trying to upload logo'}});
      }
    }

    // Check for header image
    let headerImage;
    if (req.files && req.files.header) {
      const {files: {header}} = req;
      try {
        headerImage = await uploadImage({
          data: header.data,
          filename: header.name,
          format: header.mimetype,
          height: DEFAULT_HEADER_HEIGHT,
          width: DEFAULT_HEADER_WIDTH,
          type: 'Header',
        }, {transaction});
        req.body.headerId = headerImage.id;
      } catch (error) {
        await transaction.rollback();
        logger.error(`Error while trying to upload header ${error}`);
        return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Error while trying to upload header'}});
      }
    }

    // Create new entry in db
    try {
      const newTemplate = await db.models.template.create(req.body, {transaction});
      const result = await db.models.template.scope('public').findOne({where: {id: newTemplate.id}, transaction});
      await transaction.commit();
      return res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
      await transaction.rollback();
      logger.error(`Unable to create template ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to create template'}});
    }
  });

module.exports = router;
