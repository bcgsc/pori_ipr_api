'use strict';

const express = require('express');

const router = express.Router({mergeParams: true});
const db = require(`${process.cwd()}/app/models`);
const _ = require('lodash');


/*
 * Discussion
 *
 */
router.param('discussion', async (req, res, next, ident) => {
  try {
    const result = await db.models.presentation_discussion.scope('public').findOne({where: {ident}});
    if (result === null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareOutlierLookup'}});
    req.discussion = result;
    return next();
  } catch (error) {
    return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareDiscussionQuery'}});
  }
});


// Handle requests for alterations
router.route('/discussion')
  .get(async (req, res) => {
    const opts = {
      where: {
        pog_report_id: req.report.id,
      },
      order: [['createdAt', 'ASC']],
    };

    try {
      const results = await db.models.presentation_discussion.scope('public').findAll(opts);
      res.json(results);
    } catch (error) {
      console.log(error);
      res.status(500).json({message: 'Failed to retrieve presentation discussion notes'});
    }
  })
  .post(async (req, res) => {
    const data = {
      body: req.body.body,
      user_id: req.user.id,
      pog_report_id: req.report.id,
    };

    try {
      let result = await db.models.presentation_discussion.create(data);
      result = await db.models.presentation_discussion.scope('public').findOne({where: {id: result.id}});
      res.json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json({message: 'Failed to create new discussion entry'});
    }
  });

// Single entry
router.route('/discussion/:discussion')
  .delete(async (req, res) => {
    try {
      await db.models.presentation_discussion.destroy({where: {ident: req.discussion.ident}});
      res.status(204).send();
    } catch (error) {
      console.log(error);
      res.status(500).json({message: 'Failed to remove the requested discussion entry'});
    }
  })
  .get((req, res) => {
    res.json(req.discussion);
  })
  .put(async (req, res) => {
    const data = {
      body: req.body.body,
    };

    try {
      const result = await db.models.presentation_discussion.update(data, {where: {ident: req.discussion.ident}});
      req.discussion.body = req.body.body;
      req.discussion.updatedAt = result.updatedAt;
      res.json(req.discussion);
    } catch (error) {
      console.log(error);
      res.status(500).json({message: 'Failed to update the discussion entry for server-side reasons.'});
    }
  });


/*
 * Slides
 *
 */
router.param('slide', async (req, res, next, ident) => {
  try {
    const result = await db.models.presentation_slides.scope('public').findOne({where: {ident}});
    if (result === null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareOutlierLookup'}});
    req.slide = result;
    return next();
  } catch (error) {
    console.log(error);
    return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareSlideQuery'}});
  }
});


// Handle requests for slides
router.route('/slide')
  .get(async (req, res) => {
    const opts = {
      where: {
        pog_report_id: req.report.id,
      },
    };

    try {
      const slides = [];
      let temp;
      const results = await db.models.presentation_slides.scope('public').findAll(opts);
      _.forEach(results, (s) => {
        temp = s.toJSON();
        temp.object = temp.object.toString('base64');
        slides.push(temp);
      });
      res.json(slides);
    } catch (error) {
      console.log(error);
      res.status(500).json({message: 'Failed to retrieve presentation slides'});
    }
  })
  .post(async (req, res) => {
    const data = {
      object: req.files.file.data.toString('base64'),
      user_id: req.user.id,
      pog_report_id: req.report.id,
      name: req.body.name,
      object_type: req.files.file.mimetype,
    };

    try {
      let result = await db.models.presentation_slides.create(data);
      result = await db.models.presentation_slides.scope('public').findOne({where: {id: result.id}});
      res.json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json({message: 'Failed to create new presentation slides'});
    }
  });

// Single entry
router.route('/slide/:slide')
  .delete(async (req, res) => {
    try {
      await db.models.presentation_slides.destroy({where: {ident: req.slide.ident}});
      res.status(204).send();
    } catch (error) {
      console.log(error);
      res.status(500).json({message: 'Failed to remove the requested slide'});
    }
  })
  .get((req, res) => {
    const slide = req.slide.toJSON();
    slide.object = slide.object.toString('base64');
    res.json(slide);
  });


module.exports = router;
