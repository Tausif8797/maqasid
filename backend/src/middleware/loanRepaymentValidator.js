const { body, query } = require('express-validator')

const createRules = [
  body('loanId')
    .notEmpty()
    .withMessage('Loan ID is required')
    .bail()
    .isMongoId()
    .withMessage('Invalid loan ID'),
  body('amount')
    .notEmpty()
    .withMessage('Repayment amount is required')
    .bail()
    .isFloat({ min: 1 })
    .withMessage('Repayment amount must be at least 1'),
  body('date')
    .notEmpty()
    .withMessage('Repayment date is required')
    .bail()
    .isISO8601()
    .withMessage('Invalid date'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters'),
]

const updateRules = [
  body('amount')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Repayment amount must be at least 1'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters'),
]

const listQueryRules = [
  query('loanId')
    .optional()
    .isMongoId()
    .withMessage('Invalid loan ID'),
  query('memberId')
    .optional()
    .isMongoId()
    .withMessage('Invalid member ID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
]

module.exports = {
  createRules,
  updateRules,
  listQueryRules,
}
