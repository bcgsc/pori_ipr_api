"use strict";
// Set Env
process.env.NODE_ENV = 'local';

// Dependencies
const db     = require(process.cwd() + '/app/models');
const logger = require(process.cwd() + '/app/libs/logger');
const bcrypt = require('bcryptjs');

let users = [
    {username: "aUserForTesting", password: bcrypt.hashSync("aVerySecurePassword", 10), firstName: "Test", lastName: "User", access: "clinician", authority: "local"}
];


function createTestAccounts() {
    db.models.user.bulkCreate(users, {returning:true})
    .then(console.log(`Created users for testing`))
    .catch((err) => {
        console.log(`Error creating users for testing: ${err}`);
    });

}

function deleteTestAccounts() {
    const deleteUsers = ["aUserForTesting"];

    db.models.user.destroy({where: {username: deleteUsers}, returning:true, force: true}) // need to set force to true since user table uses paranoid mode
    .then(console.log(`Deleted users for testing`))
    .catch((err) => {
        console.log(`Error deleting users for testing: ${err}`);
    });

}

function deleteTestTrackingStates() {
    return new Promise((resolve, reject) => {
        db.models.tracking_state.destroy({where: {analysis_id: null}, force: true})
        .then(() => {
            console.log(`Deleted tracking states for testing`);
            resolve();
        })
        .catch((err) => {
            console.log(`Error deleting tracking states for testing: ${err}`);
            reject();
        });
    });
    
}

module.exports = {
    createTestAccounts : createTestAccounts,
    deleteTestAccounts : deleteTestAccounts,
    deleteTestTrackingStates: deleteTestTrackingStates,
};
