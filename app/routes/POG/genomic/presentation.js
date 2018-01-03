"use strict";

let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  tcga = require(process.cwd() + '/database/exp_matrix.v8.json');



/*
 * Discussion
 *
 */
router.param('discussion', (req,res,next,ident) => {
  db.models.presentation_discussion.scope('public').findOne({ where: {ident: ident }}).then(
    (result) => {
      if(result === null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareOutlierLookup'} });
      
      req.discussion = result;
      next();
    },
    (error) => {
      return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareDiscussionQuery'} });
    }
  );
});



// Handle requests for alterations
router.route('/discussion')
  .get((req,res,next) => {
    
    let opts = {
      where: {
        pog_report_id: req.report.id
      }
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
  .post((req, res, next) => {
    
    let data = {
      body: req.body.body,
      user_id: req.user.id,
      pog_report_id: req.report.id
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
  .delete((req, res, next) => {
    
    db.models.presentation_discussion.destroy({where: {ident: req.discussion.ident}})
      .then(() => {
        res.status(204).send();
      })
      .catch((e) => {
        console.log(e);
        res.status(500).json({message: 'Failed to remove the requested discussion entry'});
      });
  })
  .get((req, res, next) => {
    res.json(req.discussion);
  })
  .put((req, res, next) => {
    
    let data = {
      body: req.body.body
    }
    
    db.models.presentation_discussion.update(data, {where: { ident: req.discussion.ident}})
      .then((result) => {
        req.discussion.body = req.body.body;
        
        res.json(req.discussion);
      })
      .catch((e) => {
        console.log(e);
        res.status(500).json({message: 'Failed to update the discussion entry for server-side reasons.'});
      });
  
  });

module.exports = router;