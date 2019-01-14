'use strict';

const express = require('express');

const router = express.Router({mergeParams: true});
const db = require(`${process.cwd()}/app/models`);
const _ = require('lodash');


/*
 * Discussion
 *
 */
router.param('discussion', (req, res, next, ident) => {
  db.models.presentation_discussion.scope('public').findOne({where: {ident: ident}}).then(
    (result) => {
      if (result === null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareOutlierLookup'}});
      req.discussion = result;
      next();
    },
    (error) => {
      return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareDiscussionQuery'}});
    }
  );
});


// Handle requests for alterations
router.route('/discussion')
  .get((req, res) => {
    const opts = {
      where: {
        pog_report_id: req.report.id,
      },
      order: [['createdAt', 'ASC']],
    };
    db.models.presentation_discussion.scope('public').findAll(opts)
      .then((results) => {
        res.json(results);
      })
      .catch((e) => {
        res.status(500).json({message: 'Failed to retrieve presentation discussion notes'});
        console.log(e);
      });
  })
  .post((req, res) => {
    const data = {
      body: req.body.body,
      user_id: req.user.id,
      pog_report_id: req.report.id,
    };
    db.models.presentation_discussion.create(data)
      .then((result) => {
        return db.models.presentation_discussion.scope('public').findOne({where: {id: result.id}});
      })
      .then((result) => {
        res.json(result);
      })
      .catch((e) => {
        console.log(e);
        res.status(500).json({message: 'Failed to create new discussion entry'});
      });
  });

// Single entry
router.route('/discussion/:discussion')
  .delete((req, res) => {
    db.models.presentation_discussion.destroy({where: {ident: req.discussion.ident}})
      .then(() => {
        res.status(204).send();
      })
      .catch((e) => {
        console.log(e);
        res.status(500).json({message: 'Failed to remove the requested discussion entry'});
      });
  })
  .get((req, res) => {
    res.json(req.discussion);
  })
  .put((req, res) => {
    const data = {
      body: req.body.body,
    };
    db.models.presentation_discussion.update(data, {where: {ident: req.discussion.ident}})
      .then((result) => {
        req.discussion.body = req.body.body;
        req.discussion.updatedAt = result.updatedAt;
        res.json(req.discussion);
      })
      .catch((e) => {
        console.log(e);
        res.status(500).json({message: 'Failed to update the discussion entry for server-side reasons.'});
      });
  });


/*
 * Slides
 *
 */
router.param('slide', (req, res, next, ident) => {
  db.models.presentation_slides.scope('public').findOne({where: {ident: ident}}).then(
    (result) => {
      if (result === null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareOutlierLookup'}});
      req.slide = result;
      next();
    },
    (error) => {
      return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareSlideQuery'}});
    }
  );
});


// Handle requests for slides
router.route('/slide')
  .get((req, res) => {
    const opts = {
      where: {
        pog_report_id: req.report.id,
      },
    };
    db.models.presentation_slides.scope('public').findAll(opts)
      .then((results) => {
        const slides = [];
        _.forEach(results, (s) => {
          const temp = s.toJSON();
          temp.object = temp.object.toString('base64');
          slides.push(temp);
        });
        res.json(slides);
      })
      .catch((e) => {
        res.status(500).json({message: 'Failed to retrieve presentation slides'});
        console.log(e);
      });
  })
  .post((req, res) => {
    const data = {
      object: req.files.file.data.toString('base64'),
      user_id: req.user.id,
      pog_report_id: req.report.id,
      name: req.body.name,
      object_type: req.files.file.mimetype,
    };

    db.models.presentation_slides.create(data)
      .then((result) => {
        return db.models.presentation_slides.scope('public').findOne({where: {id: result.id}});
      })
      .then((result) => {
        const slide = result.toJSON();
        slide.object = slide.object;
        res.json(result);
      })
      .catch((e) => {
        console.log(e);
        res.status(500).json({message: 'Failed to create new presentation slides'});
      });
  });

// Single entry
router.route('/slide/:slide')
  .delete((req, res) => {
    db.models.presentation_slides.destroy({where: {ident: req.slide.ident}})
      .then(() => {
        res.status(204).send();
      })
      .catch((e) => {
        console.log(e);
        res.status(500).json({message: 'Failed to remove the requested slide'});
      });
  })
  .get((req, res) => {
    const slide = req.slide.toJSON();
    slide.object = slide.object.toString('base64');
    res.json(slide);
  });


module.exports = router;
