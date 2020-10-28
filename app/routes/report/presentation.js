const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {REPORT_CREATE_BASE_URI, REPORT_UPDATE_BASE_URI} = require('../../constants');
const {REPORT_EXCLUDE} = require('../../schemas/exclude');

// Generate schema's
const exclude = [...REPORT_EXCLUDE, 'user_id'];
const discussionCreateSchema = schemaGenerator(db.models.presentationDiscussion, {
  baseUri: REPORT_CREATE_BASE_URI, exclude,
});
const discussionUpdateSchema = schemaGenerator(db.models.presentationDiscussion, {
  baseUri: REPORT_UPDATE_BASE_URI, exclude, nothingRequired: true,
});

const slideCreateSchema = schemaGenerator(db.models.presentationSlides, {
  baseUri: REPORT_CREATE_BASE_URI, exclude,
});
const slideUpdateSchema = schemaGenerator(db.models.presentationSlides, {
  baseUri: REPORT_UPDATE_BASE_URI, exclude, nothingRequired: true,
});


/*
 * Discussion
 *
 */
router.param('discussion', async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.presentationDiscussion.findOne({
      where: {ident},
      include: [
        {model: db.models.user.scope('public'), as: 'user'},
      ],
    });
  } catch (error) {
    logger.error(`Unable to get report discussion ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to get report discussion'}});
  }

  if (!result) {
    logger.error(`Unable to find discussion for report ${req.report.ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: `Unable to find discussion for report ${req.report.ident}`}});
  }

  // Add discussion to request
  req.discussion = result;
  return next();
});


// Handle requests for report discussions
router.route('/discussion')
  .get(async (req, res) => {
    try {
      const results = await db.models.presentationDiscussion.scope('public').findAll({
        where: {reportId: req.report.id},
        order: [['createdAt', 'ASC']],
      });
      return res.json(results);
    } catch (error) {
      logger.error(`Failed to retrieve presentation discussion ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Failed to retrieve presentation discussion'}});
    }
  })
  .post(async (req, res) => {
    // Validate request against schema
    try {
      validateAgainstSchema(discussionCreateSchema, req.body);
    } catch (err) {
      const message = `There was an error creating the discussion ${err}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    const data = {
      ...req.body,
      user_id: req.user.id,
      reportId: req.report.id,
    };

    try {
      let result = await db.models.presentationDiscussion.create(data);
      result = await db.models.presentationDiscussion.scope('public').findOne({where: {id: result.id}});
      return res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
      logger.error(`Failed to create new discussion ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'Failed to create new discussion'});
    }
  });

// Single entry
router.route('/discussion/:discussion')
  .get((req, res) => {
    return res.json(req.discussion.view('public'));
  })
  .put(async (req, res) => {
    // Validate request against schema
    try {
      validateAgainstSchema(discussionUpdateSchema, req.body, false);
    } catch (err) {
      const message = `There was an error updating the discussion ${err}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    try {
      await req.discussion.update(req.body);
      await req.discussion.reload();
      return res.json(req.discussion.view('public'));
    } catch (error) {
      logger.error(`Failed to update the discussion ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Failed to update the discussion'}});
    }
  })
  .delete(async (req, res) => {
    try {
      await req.discussion.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Failed to remove discussion ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Failed to remove discussion'}});
    }
  });


/*
 * Slides
 *
 */
router.param('slide', async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.presentationSlides.findOne({
      where: {ident},
      include: [
        {model: db.models.user.scope('public'), as: 'user'},
      ],
    });
  } catch (error) {
    logger.error(`Unable to get presentation slides ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to get presentation slides'}});
  }

  if (!result) {
    logger.error(`Unable to find presentation slides for report ${req.report.ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: `Unable to find presentation slides for report ${req.report.ident}`}});
  }

  // Add presentation slides to request
  req.slide = result;
  return next();
});


// Handle requests for slides
router.route('/slide')
  .get(async (req, res) => {
    try {
      const results = await db.models.presentationSlides.scope('public').findAll({
        where: {reportId: req.report.id},
      });
      return res.json(results);
    } catch (error) {
      logger.error(`Failed to retrieve presentation slides ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'Failed to retrieve presentation slides'});
    }
  })
  .post(async (req, res) => {
    let data;
    try {
      data = {
        object: req.files.file.data.toString('base64'),
        name: req.body.name,
        object_type: req.files.file.mimetype,
      };
    } catch (err) {
      logger.error(err);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Invalid file'}});
    }

    // Validate request against schema
    try {
      validateAgainstSchema(slideCreateSchema, data);
    } catch (err) {
      const message = `There was an error creating the slide ${err}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    try {
      // Add in user and report data
      data = {
        ...data,
        user_id: req.user.id,
        reportId: req.report.id,
      };

      let result = await db.models.presentationSlides.create(data);
      result = await db.models.presentationSlides.scope('public').findOne({where: {id: result.id}});
      return res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
      logger.error(`Failed to create a new presentation slide ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'Failed to create a new presentation slide'});
    }
  });

// Single entry
router.route('/slide/:slide')
  .get((req, res) => {
    return res.json(req.slide.view('public'));
  })
  .put(async (req, res) => {
    // Validate request against schema
    try {
      validateAgainstSchema(slideUpdateSchema, req.body, false);
    } catch (err) {
      const message = `There was an error validating the slide update request ${err}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    try {
      await req.slide.update(req.body);
      await req.slide.reload();
      return res.json(req.slide.view('public'));
    } catch (error) {
      logger.error(`Failed to update the slide ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Failed to update the slide'}});
    }
  })
  .delete(async (req, res) => {
    try {
      await req.slide.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Failed to remove slide ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Failed to remove slide'}});
    }
  });

module.exports = router;
