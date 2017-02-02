// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models');
    
let model = db.models.genomicEventsTherapeutic;

router.param('gene', (req,res,next,altIdent) => {
   model.findOne({ where: {ident: altIdent}, attributes: {exclude: ['id', 'deletedAt', 'pog_id']}, order: 'dataVersion DESC'}).then(
      (result) => {
        if(result == null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedGenomicEventsTherapeuticLookup'} });
        
        req.alteration = result;
        next();
        
      },
      (error) => {
        return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedGenomicEventsTherapeuticQuery'} });
      }
    );
});

// Handle requests for alterations
router.route('/:gene([A-z0-9-]{36})')
  .get((req,res,next) => {
    
    res.json(req.alteration);
    
  })
  .put((req,res,next) => {
    
    // Bump the version number for this entry
    req.body.dataVersion = req.alteration.dataVersion + 1;
    req.body.ident = req.alteration.ident;
    req.body.pog_id = req.POG.id;
    
    // Update result
    model.create(req.body).then(
      (result) => {
        // Send back newly created/updated result.
        res.json(result);
      },
      (error) => {
        return res.status(500).json({error: {message: 'Unable to update resource', code: 'failedAPClookup'} });
      }
    );
    
    
  })
  .delete((req,res,next) => {
    // Soft delete the entry
    // Update result
    model.destroy({ where: {ident: req.alteration.ident}}).then(
      (result) => {
        // Return success
        res.status(204);
      },
      (error) => {
        res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedGenomicEventsTherapeuticRemove'} });
      }
    );
      
          
  });

// Routing for Alteration
router.route('/')
  .get((req,res,next) => {
    
    let options = {
      where: {
        pog_id: req.POG.id
      },
      attributes: {
        exclude: ['id', 'deletedAt', 'pog_id']
      },
      order: 'dataVersion DESC',
      group: 'ident'
    }
    
    // Get all rows for this POG
    model.findAll(options).then(
      (result) => {
        res.json(result);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedGenomicEventsTherapeuticQuery'} });
      }
    );
      
  })
  .post((req,res,next) => {
    // Add a new Potential Clinical Alteration...
  });
  
module.exports = router;
