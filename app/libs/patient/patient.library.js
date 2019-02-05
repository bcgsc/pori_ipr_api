const db  = require(process.cwd() + '/app/models');
const logger = process.logger;
  
/**
 * Retrieve or Create patient ID
 *
 * @param {string} patientID - Patient ID string, eg: POG1234
 * @param {string} project - Project name the patient is associated with
 *
 * @returns {Promise/Object} - Resolves with patient model object
 */
const retrieveOrCreate = async (patientID, project = null, additionalFields = null) => {

  if (!patientID) {
    throw new Error('Patient ID is required to retrieve or create patient entry');
  }

  let patient;

  // Setting up default fields for insertion if record not found
  const defaultFields = {
    POGID: patientID,
    project: project,
  };
  //?? Need to replace with non lodash version ??
  _.extend(defaultFields, additionalFields); // extending default create object to include any additional fields

  const results = await db.models.POG.findOrCreate({ where: { POGID: patientID }, defaults: defaultFields });
  patient = results[0];
  const created = results[1];
  let projectResult = null;
  if (created && project) { // new POG record and project specified - find project or create if it doesn't exist already
    //return db.models.project.findOrCreate({ where: { name: project }, defaults: { name: project } });
    projectResult = await db.models.project.findOrCreate({ where: { name: project }, defaults: { name: project } });
  }

  if (projectResult) {
    let bindProject = projectResult[0]; // created/retrieved project

    // See if patient and project are already bound
    if (_.find(bindProject.pogs, { 'ident': bindProject.ident })) {
      return patient; // binding already exists - resolve pog
    }

    // Bind POG to project
    await db.models.pog_project.create({ project_id: bindProject.id, pog_id: patient.id });
    return patient;
  }
};

/**
 * Create patient record
 *
 * @param {string} patientID - Patient string identifier, eg: POG1234
 * @param {string} project - Project name the patient is associated with, eg: POG
 *
 * @returns {Promise} - Resolves with created patient entry model object
 */
const create = async (patientID, project) => {
  return db.models.POG.create({ POGID: patientID, project: project });
};

/**
 * Get public version of record
 *
 * @param {string} patientID - PatientID string identifier
 *
 * @returns {Promise}
 */
const public = async (patientID) => {
  return db.models.POG.scope('public').findAll({ where: { POGID: patientID } });
}
  
module.exports = {
  retrieveOrCreate,
  create,
  public,
};