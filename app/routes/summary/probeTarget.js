// app/routes/summary/probeTarget.js
let express = require('express'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models');

router.param('target', (req,res,next,altIdent) => {
   db.models.probeTarget.findOne({ where: {ident: altIdent}, attributes: {exclude: ['id', 'deletedAt']}, order: 'dataVersion DESC'}).then(
      (result) => {
        if(result == null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareProbeTargetLookup'} });
        
        req.target = result;
        next();
        
      },
      (error) => {
        return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareProbeTargetQuery'} });
      }
    );
});

// Handle requests for alterations
router.route('/:target([A-z0-9-]{36})')
  .get((req,res,next) => {
    
    res.json(req.alteration);
    
  })
  .put((req,res,next) => {
    
    // Bump the version number for this entry
    req.body.dataVersion = req.target.dataVersion + 1;
    req.body.ident = req.target.ident;
    req.body.pog_id = req.POG.id;
    
    // Update result
    db.models.probeTarget.create(req.body).then(
      (result) => {
        // Send back newly created/updated result.
        res.json(result);
      },
      (error) => {
        return res.status(500).json({error: {message: 'Unable to update resource', code: 'failedProbeTargetlookup'} });
      }
    );
    
    
  })
  .delete((req,res,next) => {
    // Soft delete the entry
    // Update result
    db.models.probeTarget.destroy({ where: {ident: req.target.ident}}).then(
      (result) => {
        res.status(204).send();
      },
      (error) => {
        res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedProbeTargetremove'} });
      }
    );
      
          
  });

// Routing for Alteration
router.route('/')
  .get((req,res,next) => {
    
    let where = {pog_id: req.POG.id}
    
    let options = {
      where: where, 
      attributes: {
        exclude: ['id', 'pog_id', 'deletedAt']
      }, 
      order: 'dataVersion DESC',
      group: 'ident'
    }
    
    // Get all rows for this POG
    db.models.probeTarget.findAll(options).then(
      (result) => {
        res.json(result);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedProbeTargetlookup'} });
      }
    );
      
  })
  
module.exports = router;
