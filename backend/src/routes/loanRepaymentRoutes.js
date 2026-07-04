const express = require('express')
const {
  createLoanRepayment,
  listAllLoanRepayments,
  listLoanRepayments,
  getLoanRepayment,
  updateLoanRepayment,
  deleteLoanRepayment,
} = require('../controllers/loanRepaymentController')
const { protect, authorize } = require('../middleware/authMiddleware')
const validate = require('../middleware/validate')
const { createRules, updateRules, listQueryRules } = require('../middleware/loanRepaymentValidator')

const router = express.Router()

router.use(protect, authorize('admin'))

router.post('/', createRules, validate, createLoanRepayment)
router.get('/', listQueryRules, validate, listAllLoanRepayments)
router.get('/loans/:loanId/repayments', validate, listLoanRepayments)
router.get('/:id', getLoanRepayment)
router.patch('/:id', updateRules, validate, updateLoanRepayment)
router.delete('/:id', deleteLoanRepayment)

module.exports = router
