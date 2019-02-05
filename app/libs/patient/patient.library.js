const db = require('../../../app/models');

module.exports = {
  /**
   * Retrieve or Create patient ID
   *
   * @param {string} patientID - Patient ID string, eg: POG1234
   * @param {string} project - Project name the patient is associated with
   * @param {Array.<string>} additionalFields - Additional fields to add to the default fields
   * @returns {Promise.<object>} - Returns with patient model object
   */
  retrieveOrCreate: async (patientID, project = null, additionalFields = null) => {

    if (!patientID) {
      throw new Error('Patient ID is required to retrieve or create patient entry');
    }

    // Setting up default fields for insertion if record not found
    const defaultFields = {
      POGID: patientID,
      project,
    };

    Object.assign(defaultFields, additionalFields);

    const results = await db.models.POG.findOrCreate({where: {POGID: patientID}, defaults: defaultFields});
    const [patient, created] = results;
    // new POG record and project specified - find project or create if it doesn't exist already
    if (created && project) {
      const projectResult = await db.models.project.findOrCreate({where: {name: project}, defaults: {name: project}});
      const [bindProject] = projectResult; // created/retrieved project

      // See if patient and project are already bound
      if (bindProject.pogs.find((pog) => { return pog.ident === bindProject.ident; })) {
        return patient; // binding already exists - resolve pog
      }

      // Bind POG to project
      await db.models.pog_project.create({project_id: bindProject.id, pog_id: patient.id});
    }
    return patient;
  },

  /**
   * Create patient record
   *
   * @param {string} patientID - Patient string identifier, eg: POG1234
   * @param {string} project - Project name the patient is associated with, eg: POG
   *
   * @returns {Promise} - Resolves with created patient entry model object
   */
  create: async (patientID, project) => {
    return db.models.POG.create({POGID: patientID, project});
  },

  /**
   * Get public version of record
   *
   * @param {string} patientID - PatientID string identifier
   * @returns {Promise.<Array.<Model>>} - Returns all public POGs matching patientID
   */
  public: async (patientID) => {
    return db.models.POG.scope('public').findAll({where: {POGID: patientID}});
  },
};
