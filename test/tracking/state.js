"use strict";

// chai dependencies
const chai          = require('chai');
const expect        = chai.expect;

// other npm dependencies
const _             = require('lodash');

// ipr module dependencies
const db            = require(process.cwd() + '/app/models');
const testData      = require("../setupTestData.js");
const State         = require(`${process.cwd()}/app/modules/tracking/state`);

describe('Create next state(s) from old state status change', () => {

    it('should create tracking cards from state with defined next_state_on_status', async () => {
        let state = new State({ident: 'test', slug: 'sequencing', analysis_id: null, status: 'complete'});

        let nextStates = await state.createNextState();
        let nextStatesOrdered = _.sortBy(nextStates, ['ordinal']);

        expect(nextStatesOrdered).to.be.an('array');
        expect(nextStatesOrdered.length).to.equal(4);
        expect(nextStatesOrdered[0]).to.have.property('slug', 'bioapps');
        expect(nextStatesOrdered[0]).to.have.property('status', 'active');
        expect(nextStatesOrdered[1]).to.have.property('slug', 'transcriptome');
        expect(nextStatesOrdered[1]).to.have.property('status', 'pending');
        expect(nextStatesOrdered[2]).to.have.property('slug', 'structural_analysis');
        expect(nextStatesOrdered[2]).to.have.property('status', 'pending');
        expect(nextStatesOrdered[3]).to.have.property('slug', 'bioinformatics');
        expect(nextStatesOrdered[3]).to.have.property('status', 'pending');
        
    });

    it('should not create a new tracking card from state with undefined next_state_on_status', async () => {
        let state = new State({ident: 'test', slug: 'bioapps', analysis_id: null, status: 'complete'});

        let nextStates = await state.createNextState();

        expect(nextStates).to.equal(undefined);
    });

    it('should not create a new tracking card from state with status not in defined next_state_on_status', async () => {
        let state = new State({ident: 'test', slug: 'sequencing', analysis_id: null, status: 'active'});

        let nextStates = await state.createNextState();

        expect(nextStates).to.equal(undefined);
    });

    it('should not create a new tracking card and set status of existing card when next state card already exists', async () => {
        let state = new State({ident: 'test', slug: 'projects', analysis_id: null, status: 'complete'});

        // generate tracking card for next state then set to pending
        let nextStates = await state.createNextState();
        await db.models.tracking_state.update({status: 'pending'}, {where: {ident: nextStates[0].ident}});
        let pendingCard = await db.models.tracking_state.findOne({where: {ident: nextStates[0].ident}});

        // card should be reset to active
        let nextStatesRepeated = await state.createNextState();
        let activeCard = await db.models.tracking_state.findOne({where: {ident: nextStates[0].ident}});

        expect(nextStatesRepeated[0]).to.have.property('slug', 'sequencing');
        expect(nextStatesRepeated[0]).to.have.property('status', 'active');
        expect(pendingCard.status).to.equal('pending'); // check that status was set to pending after first generation
        expect(activeCard.status).to.equal('active'); // check that status was reset to active after second generation
    });

    afterEach(async () => {
        try {
            await testData.deleteTestTrackingStates();
        } catch (err) {
            console.log(`Error running after in State tests: ${err}`);
        }
    });
});
