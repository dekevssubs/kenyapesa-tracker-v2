/**
 * Transaction Message Parser for Kenyan Payment Systems
 *
 * Parses M-Pesa and Bank transaction messages to extract:
 * - Transaction amount
 * - Transaction fee/cost
 * - Recipient/Merchant details
 * - Transaction reference
 * - Date/Time
 */

/**
 * Parse M-Pesa transaction message
 * Supports: Till, Paybill, Send Money, Withdraw
 */
export function parseMpesaMessage(message) {
  const result = {
    success: false,
    transactionType: null,
    amount: null,
    transactionCost: null,
    recipient: null,
    recipientNumber: null,
    reference: null,
    newBalance: null,
    transactionCode: null,
    date: null,
    rawMessage: message
  }

  try {
    // Remove extra whitespaces and normalize
    const cleanMessage = message.trim().replace(/\s+/g, ' ')

    // Extract transaction code (e.g., SHK1ABC123)
    const codeMatch = cleanMessage.match(/\b([A-Z0-9]{10})\b/)
    if (codeMatch) {
      result.transactionCode = codeMatch[1]
    }

    // Extract amounts - look for "Ksh" or "KES" followed by number
    const amountPattern = /(?:Ksh|KES)\s*([\d,]+(?:\.\d{2})?)/gi
    const amounts = []
    let match
    while ((match = amountPattern.exec(cleanMessage)) !== null) {
      amounts.push(parseFloat(match[1].replace(/,/g, '')))
    }

    // Explicitly extract transaction cost/fee
    const feeMatch = cleanMessage.match(/(?:Transaction cost|Transaction fee|Fee|Charge)[,:\s]*(?:Ksh|KES)\s*([\d,]+(?:\.\d{2})?)/i)
    if (feeMatch) {
      result.transactionCost = parseFloat(feeMatch[1].replace(/,/g, ''))
    }

    // Determine transaction type
    if (cleanMessage.toLowerCase().includes('paid to')) {
      result.transactionType = 'payment'

      // Extract recipient
      const recipientMatch = cleanMessage.match(/paid to\s+([^.]+?)(?:\s+on|\.|Ksh)/i)
      if (recipientMatch) {
        result.recipient = recipientMatch[1].trim()
      }

      // Extract payment amount (first amount in message)
      if (amounts.length >= 1) {
        result.amount = amounts[0]
        // Only use amounts[1] as fee if we didn't already extract it explicitly
        if (result.transactionCost === null && amounts.length >= 2) {
          result.transactionCost = amounts[1]
        }
      }

      // Default to 0 if no fee found
      if (result.transactionCost === null) {
        result.transactionCost = 0
      }

    } else if (cleanMessage.toLowerCase().includes('sent to')) {
      result.transactionType = 'send_money'

      const recipientMatch = cleanMessage.match(/sent to\s+([^.]+?)(?:\s+\d{10}|\.|\s+on)/i)
      if (recipientMatch) {
        result.recipient = recipientMatch[1].trim()
      }

      // Extract phone number
      const phoneMatch = cleanMessage.match(/\b(254\d{9})\b/)
      if (phoneMatch) {
        result.recipientNumber = phoneMatch[1]
      }

      if (amounts.length >= 1) {
        result.amount = amounts[0]
        // Only use amounts[1] as fee if we didn't already extract it explicitly
        if (result.transactionCost === null && amounts.length >= 2) {
          result.transactionCost = amounts[1]
        }
      }

      // Default to 0 if no fee found
      if (result.transactionCost === null) {
        result.transactionCost = 0
      }

    } else if (cleanMessage.toLowerCase().includes('received') || cleanMessage.toLowerCase().includes('received from')) {
      result.transactionType = 'received'

      const senderMatch = cleanMessage.match(/(?:received|from)\s+([^.]+?)(?:\s+\d{10}|\.|\s+on|Ksh)/i)
      if (senderMatch) {
        result.recipient = senderMatch[1].trim()
      }

      if (amounts.length >= 1) {
        result.amount = amounts[0]
        result.transactionCost = 0 // No fee for receiving
      }

    } else if (cleanMessage.toLowerCase().includes('withdraw')) {
      result.transactionType = 'withdraw'

      const agentMatch = cleanMessage.match(/from\s+([^.]+?)(?:\s+on|\.|Ksh)/i)
      if (agentMatch) {
        result.recipient = agentMatch[1].trim()
      }

      if (amounts.length >= 1) {
        result.amount = amounts[0]
        // Only use amounts[1] as fee if we didn't already extract it explicitly
        if (result.transactionCost === null && amounts.length >= 2) {
          result.transactionCost = amounts[1]
        }
      }

      // Default to 0 if no fee found
      if (result.transactionCost === null) {
        result.transactionCost = 0
      }
    }

    // Extract new balance (last amount mentioned)
    const balanceMatch = cleanMessage.match(/(?:balance is|M-PESA balance is|New M-PESA balance is)\s*(?:Ksh|KES)\s*([\d,]+(?:\.\d{2})?)/i)
    if (balanceMatch) {
      result.newBalance = parseFloat(balanceMatch[1].replace(/,/g, ''))
    } else if (amounts.length > 0) {
      // If no explicit balance, assume last amount is balance
      result.newBalance = amounts[amounts.length - 1]
    }

    // Extract date
    const dateMatch = cleanMessage.match(/on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i)
    if (dateMatch) {
      result.date = `${dateMatch[1]} ${dateMatch[2]}`
    }

    // Extract reference (for Paybill)
    const refMatch = cleanMessage.match(/(?:Account Number|Acc\.|Reference)[\s:]*([\w\d]+)/i)
    if (refMatch) {
      result.reference = refMatch[1].trim()
    }

    // Mark as successful if we got at least amount
    result.success = result.amount !== null

  } catch (error) {
    console.error('Error parsing M-Pesa message:', error)
    result.error = error.message
  }

  return result
}

/**
 * Parse Bank transaction SMS/message
 * Supports: Kenya banks (KCB, Equity, Co-op, etc.)
 */
export function parseBankMessage(message) {
  const result = {
    success: false,
    transactionType: null,
    amount: null,
    transactionCost: null,
    recipient: null,
    reference: null,
    balance: null,
    transactionCode: null,
    date: null,
    rawMessage: message
  }

  try {
    const cleanMessage = message.trim().replace(/\s+/g, ' ')

    // Extract amounts
    const amountPattern = /(?:Ksh|KES|KSh)\s*([\d,]+(?:\.\d{2})?)/gi
    const amounts = []
    let match
    while ((match = amountPattern.exec(cleanMessage)) !== null) {
      amounts.push(parseFloat(match[1].replace(/,/g, '')))
    }

    // Determine transaction type
    if (cleanMessage.toLowerCase().includes('debited') || cleanMessage.toLowerCase().includes('withdrawn')) {
      result.transactionType = 'debit'
      result.amount = amounts[0]

      const recipientMatch = cleanMessage.match(/(?:to|paid to)\s+([^.]+?)(?:\.|on|Bal)/i)
      if (recipientMatch) {
        result.recipient = recipientMatch[1].trim()
      }

    } else if (cleanMessage.toLowerCase().includes('credited') || cleanMessage.toLowerCase().includes('received')) {
      result.transactionType = 'credit'
      result.amount = amounts[0]

      const senderMatch = cleanMessage.match(/from\s+([^.]+?)(?:\.|on|Bal)/i)
      if (senderMatch) {
        result.recipient = senderMatch[1].trim()
      }

    } else if (cleanMessage.toLowerCase().includes('transfer')) {
      result.transactionType = 'transfer'
      result.amount = amounts[0]

      if (cleanMessage.toLowerCase().includes('charges')) {
        result.transactionCost = amounts[1]
      }
    }

    // Extract reference/transaction ID
    const refMatch = cleanMessage.match(/(?:Ref|Reference|Txn|Transaction)[\s:.]*([\w\d]+)/i)
    if (refMatch) {
      result.transactionCode = refMatch[1].trim()
    }

    // Extract balance
    const balanceMatch = cleanMessage.match(/(?:Bal|Balance|Avail\.?\s*Bal)[\s:]*(?:Ksh|KES)?\s*([\d,]+(?:\.\d{2})?)/i)
    if (balanceMatch) {
      result.balance = parseFloat(balanceMatch[1].replace(/,/g, ''))
    } else if (amounts.length > 1) {
      result.balance = amounts[amounts.length - 1]
    }

    // Extract date
    const dateMatch = cleanMessage.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{2}\w{3}\d{2})/i)
    if (dateMatch) {
      result.date = dateMatch[0]
    }

    result.success = result.amount !== null

  } catch (error) {
    console.error('Error parsing bank message:', error)
    result.error = error.message
  }

  return result
}

/**
 * Parse Airtel Money message
 */
export function parseAirtelMoneyMessage(message) {
  const result = {
    success: false,
    transactionType: null,
    amount: null,
    transactionCost: null,
    recipient: null,
    reference: null,
    balance: null,
    transactionCode: null,
    rawMessage: message
  }

  try {
    const cleanMessage = message.trim().replace(/\s+/g, ' ')

    // Extract amounts
    const amountPattern = /(?:Ksh|KES)\s*([\d,]+(?:\.\d{2})?)/gi
    const amounts = []
    let match
    while ((match = amountPattern.exec(cleanMessage)) !== null) {
      amounts.push(parseFloat(match[1].replace(/,/g, '')))
    }

    // Determine transaction type (similar to M-Pesa)
    if (cleanMessage.toLowerCase().includes('paid')) {
      result.transactionType = 'payment'
      result.amount = amounts[0]
      result.transactionCost = amounts[1] || 0
    } else if (cleanMessage.toLowerCase().includes('sent')) {
      result.transactionType = 'send_money'
      result.amount = amounts[0]
      result.transactionCost = amounts[1] || 0
    } else if (cleanMessage.toLowerCase().includes('received')) {
      result.transactionType = 'received'
      result.amount = amounts[0]
    }

    // Extract balance
    if (amounts.length > 0) {
      result.balance = amounts[amounts.length - 1]
    }

    result.success = result.amount !== null

  } catch (error) {
    console.error('Error parsing Airtel Money message:', error)
    result.error = error.message
  }

  return result
}

/**
 * Auto-detect and parse any transaction message
 */
export function parseTransactionMessage(message) {
  const cleanMessage = message.toLowerCase()

  if (cleanMessage.includes('m-pesa') || cleanMessage.includes('mpesa') || cleanMessage.includes('safaricom')) {
    return {
      ...parseMpesaMessage(message),
      provider: 'M-Pesa'
    }
  } else if (cleanMessage.includes('airtel money')) {
    return {
      ...parseAirtelMoneyMessage(message),
      provider: 'Airtel Money'
    }
  } else if (cleanMessage.includes('bank') || cleanMessage.includes('kcb') || cleanMessage.includes('equity') ||
             cleanMessage.includes('co-op') || cleanMessage.includes('account')) {
    return {
      ...parseBankMessage(message),
      provider: 'Bank'
    }
  } else {
    // Try M-Pesa parser as default
    return {
      ...parseMpesaMessage(message),
      provider: 'Unknown'
    }
  }
}

/**
 * Example messages for testing
 */
export const SAMPLE_MESSAGES = {
  mpesa_till: "SHK1ABC123 Confirmed. Ksh500.00 paid to JAVA HOUSE - SARIT CENTRE. on 23/12/24 at 2:15 PM. Transaction cost, Ksh0.00. New M-PESA balance is Ksh15,234.50.",

  mpesa_paybill: "SKL2XYZ456 Confirmed. Ksh2,500.00 paid to KPLC PREPAID. Account Number 123456789 on 23/12/24 at 10:30 AM. Transaction cost, Ksh0.00. New M-PESA balance is Ksh12,734.50.",

  mpesa_send: "SLM3DEF789 Confirmed. Ksh1,000.00 sent to JOHN DOE 254712345678 on 23/12/24 at 3:45 PM. Transaction cost, Ksh7.00. New M-PESA balance is Ksh14,227.50.",

  mpesa_withdraw: "SMN4GHI012 Confirmed. Ksh5,000.00 withdrawn from MAMA NJERI - WESTLANDS on 23/12/24 at 4:20 PM. Transaction cost, Ksh33.00. New M-PESA balance is Ksh9,194.50.",

  mpesa_received: "SRP5JKL345 Confirmed. You have received Ksh3,000.00 from JANE WANJIKU 254722334455 on 23/12/24 at 11:00 AM. New M-PESA balance is Ksh18,194.50.",

  kcb: "KCB: Acc XXX123 debited with Ksh3,500.00 on 23/12/24. Paid to CARREFOUR SUPERMARKET. Txn Ref: FTB8765432. Avail. Bal Ksh45,678.90.",

  equity: "Equity Bank: Your account 0123456789 has been credited with KES 25,000.00 from EMPLOYER NAME on 23Dec24. Ref: SAL123456. Balance: KES 67,890.00",

  coop: "Co-op Bank: KES 1,200.00 withdrawn from A/C ****5678 via ATM on 23/12/24. Transaction charges KES 35.00. Available Balance KES 23,456.00. Ref: ATM9876543"
}

export default {
  parseTransactionMessage,
  parseMpesaMessage,
  parseBankMessage,
  parseAirtelMoneyMessage,
  SAMPLE_MESSAGES
}
