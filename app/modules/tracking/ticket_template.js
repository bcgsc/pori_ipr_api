const db = require('../../models/');

const logger = require('../../../lib/log');

class TicketTemplate {
  /**
   * Initialize tracking state object
   *
   * @param {string|object} init - Pass in either ident string or new object
   */
  constructor(init) {
    this.instance = null;
    this.model = db.models.tracking_ticket_template;

    // Existing instance
    if (typeof init === 'object' && typeof init.ident === 'string') {
      this.instance = init;
    }

    if (!init || !this.instance) {
      logger.error('Unable to initiate State Tracking Ticket Template');
      throw new Error('Unable to initiate State Tracking Ticket Template');
    }
  }

  /**
   * Create new ticket template
   *
   * A new template that can be invoked when generating a new ticket.
   *
   * @param {string} ident - State ID
   * @param {string} name - Name of ticket template
   * @param {string} body - Body of ticket template
   *
   * @returns {Promise.<object>} - Returns updated instance
   */
  async create(ident, name, body) {
    // Convert state ident into model object
    let state;
    try {
      state = await db.models.tracking_state_definition.findOne({where: {ident}});
    } catch (error) {
      logger.error(`Failed to get tracking state definition ${error}`);
      throw new Error(`Failed to get tracking state definition error: ${error}`);
    }

    if (!state) {
      logger.error('Failed to find the requested state');
      throw new Error('Failed to find the requested state');
    }

    const template = {
      state_id: state.id,
      name,
      body,
    };

    let newInstance;
    try {
      newInstance = await this.model.create(template);
    } catch (error) {
      logger.error(`Failed to create new ticket template ${error}`);
      throw new Error(`Failed to create new ticket template error: ${error}`);
    }

    this.instance = newInstance;
    return this.instance;
  }

  /**
   * Update the current ticket template
   *
   * @param {string} template - Template object
   * @returns {Promise.<object>} - Returns updated instance
   */
  async update(template) {
    if (template.name) {
      this.instance.name = template.name;
    }
    if (template.body) {
      this.instance.body = template.body;
    }
    if (template.summary) {
      this.instance.summary = template.summary;
    }
    if (template.project) {
      this.instance.project = template.project;
    }
    if (template.components) {
      this.instance.components = template.components;
    }
    if (template.tags) {
      this.instance.tags = template.tags;
    }
    if (template.priority) {
      this.instance.priority = template.priority;
    }
    if (template.issueType) {
      this.instance.issueType = template.issueType;
    }
    if (template.security) {
      this.instance.security = template.security;
    }

    try {
      await this.model.update(template, {where: {ident: this.instance.ident}});
      return this.instance;
    } catch (error) {
      logger.error(`Failed to update ticket template ${error}`);
      throw new Error(`Failed to update ticket template error: ${error}`);
    }
  }

  /**
   * Get full public version of this instance
   *
   * @returns {Promise.<object>} - Returns public instance
   */
  async getPublic() {
    const opts = {
      where: {
        ident: this.instance.ident,
      },
      attributes: {
        exclude: ['deletedAt', 'id', 'definition_id'],
      },
      include: [
        {as: 'definition', model: db.models.tracking_state_definition.scope('public')},
      ],
    };

    // Get updated public state with nested tasks
    try {
      const template = await this.model.scope('public').findOne(opts);
      return template;
    } catch (error) {
      logger.error(`Failed to get updated state ${error}`);
      throw new Error(`Failed to get updated state ${error}`);
    }
  }
}

module.exports = TicketTemplate;
