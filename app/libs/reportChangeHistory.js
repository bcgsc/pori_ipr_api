const _ = require('lodash');

const db = require('../models');

const {logger} = process;

module.exports = {

  /**
   * Record change history for a create event within a report
   *
   * @param {String} entryIdent - the ident of the record being created
   * @param {String} modelName - the name of the db model the record is being inserted into
   * @param {Number} userId - the id of the user creating the record
   * @param {Number} reportId - the id of the report the record belongs to
   * @param {String} [displayName] - a human readable label for what object was created
   *
   * @returns {Promise} - boolean value representing success/failure
   *
   */
  async recordCreate(entryIdent, modelName, userId, reportId, displayName) {
    if (!entryIdent || !modelName || !userId || !reportId) {
      throw new Error('Missing one or more of the following mandatory parameters: entryIdent, modelName, userId, reportId');
    }

    const tableName = db.models[modelName].getTableName();

    const changeHistory = {
      type: 'create',
      entry_ident: entryIdent,
      model_name: modelName,
      table_name: tableName,
      user_id: userId,
      display_name: displayName,
    };

    try {
      const createChangeHistory = await db.models.change_history.create(changeHistory);

      const reportChangeHistory = {
        change_history_id: createChangeHistory.id,
        report_id: reportId,
      };
      await db.models.report_change_history.create(reportChangeHistory);
      return true;
    } catch (err) {
      logger.error(`An error occurred while generating change history records: ${err}`);
      return false;
    }
  },

  /**
   * Record change history for an update event within a report
   *
   * @param {String} entryIdent - the ident of the record being updated
   * @param {String} modelName - the name of the db model the updated record belongs to
   * @param {String} fieldName - the name of the db field being updated
   * @param {String} previousValue - the old value of the field being updated
   * @param {String} newValue - the new (current) value of the field being updated
   * @param {Number} userId - the id of the user updating the record
   * @param {Number} reportId - the id of the report the record belongs to
   * @param {String} [displayName] - a human readable label for what object was updated
   * @param {String} [comment] - description for what and/or why changes are being made
   *
   * @returns {Promise} - boolean value representing success/failure
   *
   */
  async recordUpdate(entryIdent, modelName, fieldName, previousValue, newValue, userId, reportId, displayName, comment) {
    if (!entryIdent || !modelName || !fieldName || !previousValue || !newValue || !userId || !reportId) {
      throw new Error('Missing one or more of the following mandatory parameters: entryIdent, modelName, fieldName, previousValue, newValue, userId, reportId');
    }

    const tableName = db.models[modelName].getTableName();

    const changeHistory = {
      type: 'update',
      entry_ident: entryIdent,
      model_name: modelName,
      table_name: tableName,
      field_name: fieldName,
      previous_value: previousValue,
      new_value: newValue,
      user_id: userId,
      display_name: displayName,
      comment,
    };

    try {
      const updateChangeHistory = await db.models.change_history.create(changeHistory);

      const reportChangeHistory = {
        change_history_id: updateChangeHistory.id,
        report_id: reportId,
      };
      await db.models.report_change_history.create(reportChangeHistory);
      return true;
    } catch (err) {
      logger.error(`An error occurred while generating change history records: ${err}`);
      return false;
    }
  },

  /**
   * Record change history for a delete event within a report
   *
   * @param {String} entryIdent - the ident of the record being deleted
   * @param {String} modelName - the name of the db model the deleted record belonged to
   * @param {Object} deletedContent - JSON representation of the record being deleted
   * @param {Number} userId - the id of the user deleting the record
   * @param {Number} reportId - the id of the report the record belonged to
   * @param {String} [displayName] - a human readable label for what object was deleted
   * @param {String} [comment] - description for what and/or why record is being deleted
   *
   * @returns {Promise} - boolean value representing success/failure
   *
   */
  async recordDelete(entryIdent, modelName, deletedContent, userId, reportId, displayName, comment) {
    if (!entryIdent || !modelName || !deletedContent || !userId || !reportId) {
      throw new Error('Missing one or more of the following mandatory parameters: entryIdent, tableName, deletedContent, userId, reportId');
    }

    const tableName = db.models[modelName].getTableName();

    const changeHistory = {
      type: 'delete',
      entry_ident: entryIdent,
      model_name: modelName,
      table_name: tableName,
      deleted_content: deletedContent,
      user_id: userId,
      display_name: displayName,
      comment,
    };

    try {
      const deleteChangeHistory = await db.models.change_history.create(changeHistory);

      const reportChangeHistory = {
        change_history_id: deleteChangeHistory.id,
        report_id: reportId,
      };
      await db.models.report_change_history.create(reportChangeHistory);
      return true;
    } catch (err) {
      logger.error(`An error occurred while generating change history records: ${err}`);
      return false;
    }
  },

  /**
   * Revert a change history event within a report
   *
   * @param {Number} changeHistoryId - the id of the change history record to be reverted
   * @param {Number} userId - the id of the user performing the reversion
   * @param {String} [comment] - description for what and/or why record is being reverted
   *
   * @returns {Promise} - boolean value representing success/failure
   *
   */
  async revert(changeHistoryId, userId, comment) {
    if (!changeHistoryId || !userId) {
      throw new Error('Missing one or more of the following mandatory parameters: changeHistoryId, userId');
    }

    try {
      const changeHistoryEvent = await db.models.change_history.findOne({where: {id: changeHistoryId}});
      const reportChangeHistoryEvent = await db.models.report_change_history.findOne({where: {change_history_id: changeHistoryId}});
      const errorMessages = [];

      if (!changeHistoryEvent) throw new Error(`No change history event with id ${changeHistoryId} was found`);

      switch (changeHistoryEvent.type) {
        case 'update': {
          // set value of field field_name in model model_name w/ ident entry_ident to the value previous_value
          const updateFields = {};
          updateFields[changeHistoryEvent.field_name] = changeHistoryEvent.previous_value;
          const updatedRecord = await db.models[changeHistoryEvent.model_name].update(updateFields, {where: {ident: changeHistoryEvent.entry_ident}, returning: true});

          // record revert event as another update event
          const recordUpdateSuccess = await this.recordUpdate(
            changeHistoryEvent.entry_ident,
            changeHistoryEvent.model_name,
            changeHistoryEvent.field_name,
            changeHistoryEvent.new_value,
            changeHistoryEvent.previous_value,
            userId,
            reportChangeHistoryEvent.report_id,
            changeHistoryEvent.display_name,
            comment
          );

          if (updatedRecord[1][0][changeHistoryEvent.field_name] !== changeHistoryEvent.previous_value) errorMessages.push(`Field ${changeHistoryEvent.field_name} did not have its value updated properly`);
          if (!recordUpdateSuccess) errorMessages.push(`Failed to record change history event for updating field ${changeHistoryEvent.field_name}`);

          break;
        }
        case 'delete': {
          // check that record doesn't already exist
          const recordExists = await db.models[changeHistoryEvent.model_name].findOne({where: {ident: changeHistoryEvent.deleted_content.ident}});

          // check that delete change history is the most recent to exist
          const opts = {
            where: {
              id: reportChangeHistoryEvent.report_id,
              '$change_history.type$': 'delete',
            },
            include: [
              {as: 'change_history', model: db.models.change_history},
            ],
          };

          const report = await db.models.analysis_report.find(opts);

          let isMostRecentDelete = false;
          const mostRecentDelete = _.orderBy(report.change_history, ['created_at'], ['desc'])[0]; // get most recent deletion
          if (mostRecentDelete.id === changeHistoryEvent.id) isMostRecentDelete = true;

          // if record doesn't exist and is the most recent deletion, restore record
          if (!recordExists && isMostRecentDelete) {
            // recreate record using info stored in deleted_content field
            const insertedRecord = await db.models[changeHistoryEvent.model_name].create(changeHistoryEvent.deleted_content);

            // record revert event as a create event
            const recordCreateSuccess = await this.recordCreate(
              insertedRecord.ident,
              changeHistoryEvent.model_name,
              userId,
              reportChangeHistoryEvent.report_id,
              changeHistoryEvent.display_name
            );

            
            // all records should have an ident, something went wrong if this field doesn't match
            if (insertedRecord.ident !== changeHistoryEvent.deleted_content.ident) errorMessages.push(`Record with ident ${insertedRecord.ident} in table ${changeHistoryEvent.table_name} was not recreated properly`);
            if (!recordCreateSuccess) errorMessages.push(`Failed to record change history event for creating record with ident ${insertedRecord.ident} in table ${changeHistoryEvent.table_name}`);
          } else {
            if (recordExists) errorMessages.push(`Record with ident ${recordExists.ident} already exists`);
            if (!isMostRecentDelete) errorMessages.push('The record you are attempting to restore is outdated - only the most recent deleted version may be restored');
          }

          break;
        }
        default:
          throw new Error(`Change history events of type ${changeHistoryEvent.type} cannot be reverted`);
      }

      if (errorMessages.length > 0) {
        const errMessage = errorMessages.join(',');
        throw new Error(errMessage);
      }

      return true; // Revert was a success if we reach this line without errors
    } catch (err) {
      logger.error(`An error occurred while attempting to revert a change history event: ${err.message}`);
      return false;
    }
  },
};
