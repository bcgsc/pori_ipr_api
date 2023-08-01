const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const db = require('../../models');
const logger = require('../../log');
const { getUserProjects } = require('../../libs/helperFunctions');
const router = express.Router({ mergeParams: true });

router.route('/')
    .get(async (req, res) => {
        const userIdent = req.body.user;
        const projectIdent = req.body.project;
        const userGroupIdent = req.body.user_group;
        const templateIdent = req.body.template;
        let user;
        if (userIdent) {
            try {
                user = await db.models.user.findOne({
                    where: { ident: req.body.user },
                });
                if (userIdent && !user) {
                    logger.error(`Unable to find user ${req.body.user}`);
                    return res.status(HTTP_STATUS.NOT_FOUND).json({ error: { message: 'Unable to find user' } });
                }
            } catch (error) {
                logger.error(`Error while trying to find user  ${error}`);
                return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                    error: { message: 'Error while trying to find user' },
                });
            }
        }

        let userGroup;
        if (userGroupIdent) {
            try {
                userGroup = await db.models.userGroup.findOne({
                    where: { ident: req.body.user_group },
                });
                if (userGroupIdent && !userGroup) {
                    logger.error(`Unable to find user group ${req.body.user_group}`);
                    return res.status(HTTP_STATUS.NOT_FOUND).json({ error: { message: 'Unable to find user group' } });
                }
            } catch (error) {
                logger.error(`Error while trying to find user group ${error}`);
                return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                    error: { message: 'Error while trying to find user group' },
                });
            }
        }

        let project;
        if (projectIdent) {
            try {
                project = await db.models.project.findOne({
                    where: { ident: req.body.project },
                });
                if (projectIdent && !project) {
                    logger.error(`Unable to find project ${req.body.project}`);
                    return res.status(HTTP_STATUS.NOT_FOUND).json({ error: { message: 'Unable to find project' } });
                }
            } catch (error) {
                logger.error(`Error while trying to find project ${error}`);
                return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                    error: { message: 'Error while trying to find project' },
                });
            }
        }


        let template;
        if (templateIdent) {
            try {
                template = await db.models.template.findOne({
                    where: { ident: req.body.template },
                });
                if (templateIdent && !template) {
                    logger.error(`Unable to find template ${req.body.template}`);
                    return res.status(HTTP_STATUS.NOT_FOUND).json({ error: { message: 'Unable to find template' } });
                }
            } catch (error) {
                logger.error(`Error while trying to find template ${error}`);
                return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                    error: { message: 'Error while trying to find template' },
                });
            }
        }

        try {
            let whereClause = {};

            if (user) {
                whereClause.user_id = user.id;
            }
            if (userGroup) {
                whereClause.user_group_id = userGroup.id;
            }
            if (template) {
                whereClause.template_id = template.id;
            }
            if (project) {
                whereClause.project_id = project.id;
            }
            const results = await db.models.notification.scope('public').findAll({
                where: whereClause
            });

            return res.json(results);
        } catch (error) {
            console.log(`${error}`);
            logger.error(`${error}`);
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: { message: 'Problem getting notification' },
            });

        }
    })
    .post(async (req, res) => {
        if (req.body.user && req.body.user_group) {
            return res.status(HTTP_STATUS.CONFLICT).json({
                error: { message: 'Only one of user and user group should be specified' }
            })
        }
        if (!req.body.user && !req.body.user_group) {
            return res.status(HTTP_STATUS.CONFLICT).json({
                error: { message: 'Exactly one of user and user group should be specified' }
            })
        }
        if (!req.body.project) {
            return res.status(HTTP_STATUS.CONFLICT).json({
                error: { message: 'Project must be specified' }
            })
        }
        if (!req.body.template) {
            return res.status(HTTP_STATUS.CONFLICT).json({
                error: { message: 'Template must be specified' }
            })
        }

        let project;
        try {
            project = await db.models.project.findOne({
                where: { ident: req.body.project },
            });
        } catch (error) {
            logger.error(`Error while trying to find project ${error}`);
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: { message: 'Error while trying to find project' },
            });
        }
        if (!project) {
            logger.error(`Unable to find project ${req.body.project}`);
            return res.status(HTTP_STATUS.NOT_FOUND).json({ error: { message: 'Unable to find project' } });
        }


        let user;
        let userGroup;
        if (req.body.user) {
            try {
                user = await db.models.user.findOne({
                    where: { ident: req.body.user },
                });
            } catch (error) {
                logger.error(`Error while trying to find user ${error}`);
                return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                    error: { message: 'Error while trying to find user' },
                });
            }
            if (!user) {
                logger.error(`Unable to find user ${req.body.user}`);
                return res.status(HTTP_STATUS.NOT_FOUND).json({ error: { message: 'Unable to find user' } });
            }

            let projectBinding;
            try {
                projectBinding = await db.models.userProject.findOne({
                    where: { user_id: user.id, project_id: project.id },
                });
            } catch (error) {
                logger.error(`Error while trying to find user-project binding ${error}`);
                return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                    error: { message: 'Error while trying to find user-project binding' },
                });
            }
            if (!projectBinding) {
                logger.error(`User ${user.ident} is not bound to project ${project.name} and can not receive notifications for it`);
                return res.status(HTTP_STATUS.CONFLICT).json({
                    error: { message: 'User is not bound to project and can not receive updates for it' },
                });
            }
        } else {
            try {
                userGroup = await db.models.userGroup.findOne({
                    where: { ident: req.body.user_group },
                });
            } catch (error) {
                logger.error(`Error while trying to find user group ${error}`);
                return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                    error: { message: 'Error while trying to find user group' },
                });
            }
            if (!userGroup) {
                logger.error(`Unable to find user group ${req.body.user_group}`);
                return res.status(HTTP_STATUS.NOT_FOUND).json({ error: { message: 'Unable to find user group' } });
            }
        }


        let template;
        if (req.body.template) {
            try {
                template = await db.models.template.findOne({
                    where: { ident: req.body.template },
                });
            } catch (error) {
                logger.error(`Error while trying to find template ${template}`);
                return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                    error: { message: 'Error while trying to find template' },
                });
            }
        }
        if (req.body.template && !template) {
            logger.error(`Unable to find template ${req.body.template}`);
            return res.status(HTTP_STATUS.NOT_FOUND).json({ error: { message: 'Unable to find template' } });
        }

        try {
            const newnotif = await db.models.notification.create({
                projectId: project.id, userId: user ? user.id : null, userGroupId: userGroup ? userGroup.id : null, eventType: req.body.event_type, templateId: template.id,
            });

            // Load new notif with associations
            const result = await db.models.notification.scope('public').findOne({
                where: { id: newnotif.id },
            });

            return res.status(HTTP_STATUS.CREATED).json(result);

        } catch (error) {
            logger.error(`Error while creating notification ${error}`);
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: { message: 'Error while creating notification ' },
            });
        }
    })
    .delete(async (req, res) => {
        let notification;
        try {
            notification = await db.models.notification.findOne({
                where: { ident: req.body.ident },
                attributes: ['id', 'ident'],
            });
        } catch (error) {
            logger.error(`Error while trying to find notification ${error}`);
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: { message: 'Error while trying to find notification' },
            });
        }

        if (!notification) {
            logger.error(`Unable to find notification ${req.body.user}`);
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                error: { message: 'Unable to find the provided notification' },
            });
        }

        try {
            await notification.destroy();
            return res.status(HTTP_STATUS.NO_CONTENT).send();
        } catch (error) {
            logger.error(`Error while deleting notification ${error}`);
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: { message: 'Error while deleting notification' },
            });
        }
    });
module.exports = router;
