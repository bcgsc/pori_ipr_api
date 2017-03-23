// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    versionDatum = new require(process.cwd() + '/app/libs/VersionDatum');
    
let model = db.models.genomicEventsTherapeutic;

router.param('gene', (req,res,next,altIdent) => {
   model.findOne({ where: {ident: altIdent}, attributes: {exclude: ['id', '"deletedAt"']}}).then(
      (result) => {
        if(result == null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedGenomicEventsTherapeuticLookup'} });
        
        req.event = result;
        next();
        
      },
      (error) => {
        return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedGenomicEventsTherapeuticQuery'} });
      }
    );
});

// Handle requests for events
router.route('/:gene([A-z0-9-]{36})')
  .get((req,res,next) => {
    
    res.json(req.event);
    
  })
  .put((req,res,next) => {

    // Update DB Version for Entry
    versionDatum(model, req.event, req.body, req.user).then(
      (resp) => {
        res.json(resp.data.create);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedMutationSummaryVersion'}});
      }
    );
    
  })
  .delete((req,res,next) => {
    // Soft delete the entry
    // Update result
    model.destroy({ where: {ident: req.event.ident}}).then(
      (result) => {
        // Return success
        res.status(204);
      },
      (error) => {
        res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedGenomicEventsTherapeuticRemove'} });
      }
    );
      
          
  });

// Routing for event
router.route('/')
  .get((req,res,next) => {
    
    let options = {
      where: {
        pog_id: req.POG.id
      },
      attributes: {
        exclude: ['id', '"deletedAt"', 'pog_id']
      }
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
      
  });
  
module.exports = router;
