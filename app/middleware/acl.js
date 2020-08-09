const db = require('../models');
const logger = require('../log');
const {caseInsensitiveIntersect} = require('../libs/helperFunctions');

class ACL {
  /**
   * Create ACL object
   *
   * @param {object} request - Express request object
   * @property {Array<string>} groups - User must belong to one of these groups
   * @property {Array<string>} nGroups - Groups explicitly not allowed
   * @property {Array<string>} read - The groups that can read from all endpoints
   * @property {Array<string>} write - The groups that can write to non-report endpoints
   * @property {Array<string>} delete - The groups that can delete from non-report endpoints
   * @property {Array<string>} restrictedReportEdit - The groups that can edit (i.e write, delete) a report when they are bound to the report
   * @property {Array<string>} masterReportEdit - The groups that can always edit a report
   * @property {Array<string>} reportEdit - All the groups that can edit a report
   */
  constructor(request) {
    this.req = request;
    this.groups = [];
    this.nGroups = [];
    this.read = ['*'];
    this.write = ['manager', 'admin'];
    this.delete = ['manager', 'admin'];
    this.restrictedReportEdit = ['analyst', 'reviewer', 'bioinformatician'];
    this.masterReportEdit = ['manager', 'admin'];
    this.reportEdit = this.restrictedReportEdit.concat(this.masterReportEdit);
  }

  // Get project access
  async getProjectAccess() {
    const accessGroups = ['Full Project Access', 'admin'];
    const userGroups = this.req.user.groups.map((group) => {
      return group.name;
    });
    const hasAccess = caseInsensitiveIntersect(accessGroups, userGroups);

    if (hasAccess.length > 0) { // user has full project access
      return db.models.project.findAll();
    }
    // user does not have full project access - filter on user_project relation
    return this.req.user.projects;
  }

  // Check if the user has the correct permissions to perform
  // the requested method (i.e GET, POST) at the specified route
  check() {
    // Get the groups the user belongs to
    const userGroups = this.req.user.groups.map((group) => {
      return group.name.toLowerCase();
    });


    // Check that the allowed groups and disallowed groups don't contain the same group
    if (caseInsensitiveIntersect(this.groups, this.nGroups).length > 0 || (this.groups.includes('*') && this.nGroups.length > 0)) {
      logger.error('Group(s) in both allowed and not allowed');
      throw new Error('Group(s) in both allowed and not allowed');
    }
    // Check if user belongs to one of the allowed groups if not return false
    if (this.groups.length > 0 && !this.groups.includes('*') && caseInsensitiveIntersect(userGroups, this.groups).length === 0) {
      logger.warn(`User: ${this.req.user.username} doesn't belong to one of the allowed group(s): ${this.groups.join()}`);
      return false;
    }
    // Check that user doesn't belong to one or more of the not allowed groups, return false if they do
    if (caseInsensitiveIntersect(userGroups, this.nGroups).length > 0) {
      logger.warn(`User: ${this.req.user.username} belongs to one or more of the not allowed group(s): ${this.nGroups.join()}`);
      return false;
    }


    // Check if this is a report endpoint
    if (this.req.report) {
      // Check if this is a write endpoint and the user belongs
      // to a group that is allowed to edit reports
      if (['POST', 'PUT', 'DELETE'].includes(this.req.method)
        && caseInsensitiveIntersect(userGroups, this.reportEdit).length > 0
      ) {
        // check if user is bound to report
        const boundUser = this.req.report.users.some((reportUser) => {
          return reportUser.user.ident === this.req.user.ident;
        });

        // They are allowed to edit if they belong to one of the groups in masterReportEdit
        // or if they have been bound to the report
        return caseInsensitiveIntersect(userGroups, this.masterReportEdit).length > 0 || boundUser;
      }

      // If read is not set to allow all, run check for read access
      if (this.req.method === 'GET'
        && (this.read.includes('*')
        || caseInsensitiveIntersect(userGroups, this.read).length > 0)
      ) {
        return true;
      }

      return false;
    }


    // Non-report endpoints


    // If the method is GET and the user has read access
    // and/or everyone is allowed to read at this endpoint
    if (this.req.method === 'GET'
      && (this.read.includes('*')
      || caseInsensitiveIntersect(userGroups, this.read).length > 0)
    ) {
      return true;
    }

    // If the method is an edit and the user has write permissions
    // and/or everyone is allowed to write at this endpoint
    if (['POST', 'PUT', 'DELETE'].includes(this.req.method)
      && (this.write.includes('*')
      || caseInsensitiveIntersect(userGroups, this.write).length > 0)
    ) {
      return true;
    }

    return false;
  }

  // Check if the request user is admin
  isAdmin() {
    return this.req.user.get('groups').some((group) => {
      return group.name.toLowerCase() === 'admin';
    });
  }
}

module.exports = ACL;
