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

    // Explicitly extract transaction cost/fee - improved pattern
    const feeMatch = cleanMessage.match(/(?:Transaction cost|Transaction fee|Transaction charge|Fee|Charge)[,:\s]*(?:Ksh|KES)?\s*([\d,]+(?:\.\d{2})?)/i)
    if (feeMatch) {
      result.transactionCost = parseFloat(feeMatch[1].replace(/,/g, ''))
    }

    // Also try to extract from "New M-PESA balance" context to avoid confusion
    // Extract balance FIRST to remove it from consideration for fee
    const balanceMatch = cleanMessage.match(/(?:balance is|M-PESA balance is|New M-PESA balance is|New balance is)\s*(?:Ksh|KES)\s*([\d,]+(?:\.\d{2})?)/i)
    if (balanceMatch) {
      result.newBalance = parseFloat(balanceMatch[1].replace(/,/g, ''))
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
        // AND make sure it's not the balance amount
        if (result.transactionCost === null && amounts.length >= 2) {
          // Filter out the balance if we extracted it
          const feeCandidate = amounts[1]
          if (result.newBalance === null || feeCandidate !== result.newBalance) {
            result.transactionCost = feeCandidate
          }
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
        // AND make sure it's not the balance amount
        if (result.transactionCost === null && amounts.length >= 2) {
          const feeCandidate = amounts[1]
          if (result.newBalance === null || feeCandidate !== result.newBalance) {
            result.transactionCost = feeCandidate
          }
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
        // AND make sure it's not the balance amount
        if (result.transactionCost === null && amounts.length >= 2) {
          const feeCandidate = amounts[1]
          if (result.newBalance === null || feeCandidate !== result.newBalance) {
            result.transactionCost = feeCandidate
          }
        }
      }

      // Default to 0 if no fee found
      if (result.transactionCost === null) {
        result.transactionCost = 0
      }
    }

    // Balance was already extracted at the top (lines 57-60)
    // If still not set, try last amount as fallback (but be careful)
    if (result.newBalance === null && amounts.length > 0) {
      // Only use last amount if we have at least 3 amounts (amount, fee, balance)
      // Otherwise it might be the fee
      if (amounts.length >= 3) {
        result.newBalance = amounts[amounts.length - 1]
      }
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
 * Supports: Kenya banks (KCB, Equity, Co-op, NCBA, etc.)
 *
 * Bank to M-Pesa transactions typically come in 2 messages:
 * 1. Bank debit notification
 * 2. M-Pesa confirmation (Till, Paybill, or Send Money)
 */
export function parseBankMessage(message) {
  const result = {
    success: false,
    transactionType: null,
    bankTransferType: null, // 'bank_to_till', 'bank_to_mpesa', 'bank_to_paybill'
    amount: null,
    transactionCost: null, // Bank messages don't include fees, user must enter manually
    recipient: null,
    recipientNumber: null, // Till number or phone number
    reference: null,
    bankReference: null,
    mpesaReference: null,
    balance: null,
    transactionCode: null,
    date: null,
    time: null,
    bankName: null,
    accountNumber: null,
    requiresManualFee: true, // Flag to indicate user needs to enter fee
    rawMessage: message
  }

  try {
    const cleanMessage = message.trim().replace(/\s+/g, ' ')
    const lowerMessage = cleanMessage.toLowerCase()

    // Extract amounts - handles both "KES 8,247.00" and "KES. 15000.00" formats
    const amountPattern = /(?:Ksh|KES)\.?\s*([\d,]+(?:\.\d{2})?)/gi
    const amounts = []
    let match
    while ((match = amountPattern.exec(cleanMessage)) !== null) {
      amounts.push(parseFloat(match[1].replace(/,/g, '')))
    }

    // Detect bank name from message
    if (lowerMessage.includes('ncba') || lowerMessage.includes('go for it')) {
      result.bankName = 'NCBA'
    } else if (lowerMessage.includes('kcb')) {
      result.bankName = 'KCB'
    } else if (lowerMessage.includes('equity')) {
      result.bankName = 'Equity'
    } else if (lowerMessage.includes('co-op') || lowerMessage.includes('coop')) {
      result.bankName = 'Co-op'
    } else if (lowerMessage.includes('stanbic')) {
      result.bankName = 'Stanbic'
    } else if (lowerMessage.includes('absa')) {
      result.bankName = 'ABSA'
    } else if (lowerMessage.includes('dtb')) {
      result.bankName = 'DTB'
    } else if (lowerMessage.includes('i&m')) {
      result.bankName = 'I&M'
    }

    // Extract masked account number (e.g., "992****013")
    const accountMatch = cleanMessage.match(/account\s*(\d{3}\*+\d{3})/i)
    if (accountMatch) {
      result.accountNumber = accountMatch[1]
    }

    // ===== NCBA Bank to Till Pattern =====
    // "Mpesa Till transfer of KES 8247 to 65575 Naivas Kitengela BANK REF. FTX25320XAREM MPESA REF. TKGSG4268Q was successful"
    const tillMatch = cleanMessage.match(/(?:Mpesa\s+)?Till\s+transfer\s+of\s+(?:KES|Ksh)\.?\s*([\d,]+(?:\.\d{2})?)\s+to\s+(\d+)\s+([^.]+?)\s+BANK\s+REF\.?\s*(\w+)\s+MPESA\s+REF\.?\s*(\w+)/i)
    if (tillMatch) {
      result.transactionType = 'bank_transfer'
      result.bankTransferType = 'bank_to_till'
      result.amount = parseFloat(tillMatch[1].replace(/,/g, ''))
      result.recipientNumber = tillMatch[2] // Till number
      result.recipient = tillMatch[3].trim() // Business name
      result.bankReference = tillMatch[4]
      result.mpesaReference = tillMatch[5]
      result.transactionCode = tillMatch[5] // Use M-Pesa ref as primary code
      result.success = true
      return result
    }

    // ===== NCBA Bank to M-Pesa User Pattern =====
    // "Dear Kelvin Kipkoech, your MPESA transfer of KES. 15000.00 to Elizabeth Mukami Njue (254725084893) has been processed successfully. MPESA ref number TLO781XMO5"
    const mpesaUserMatch = cleanMessage.match(/(?:Dear\s+([^,]+),\s+)?your\s+MPESA\s+transfer\s+of\s+(?:KES|Ksh)\.?\s*([\d,]+(?:\.\d{2})?)\s+to\s+([^(]+)\s*\((\d+)\)\s+has\s+been\s+processed\s+successfully\.?\s*MPESA\s+ref\s+(?:number\s+)?(\w+)/i)
    if (mpesaUserMatch) {
      result.transactionType = 'bank_transfer'
      result.bankTransferType = 'bank_to_mpesa'
      result.amount = parseFloat(mpesaUserMatch[2].replace(/,/g, ''))
      result.recipient = mpesaUserMatch[3].trim() // Recipient name
      result.recipientNumber = mpesaUserMatch[4] // Phone number
      result.mpesaReference = mpesaUserMatch[5]
      result.transactionCode = mpesaUserMatch[5]
      result.success = true
      return result
    }

    // ===== NCBA Bank to Paybill Pattern =====
    // "Mpesa Paybill payment of KES 5000 to 123456 Account XYZ BANK REF. FTX123 MPESA REF. ABC123 was successful"
    const paybillMatch = cleanMessage.match(/(?:Mpesa\s+)?Paybill\s+(?:payment|transfer)\s+of\s+(?:KES|Ksh)\.?\s*([\d,]+(?:\.\d{2})?)\s+to\s+(\d+)\s+(?:Account\s+)?([^.]+?)\s+BANK\s+REF\.?\s*(\w+)\s+MPESA\s+REF\.?\s*(\w+)/i)
    if (paybillMatch) {
      result.transactionType = 'bank_transfer'
      result.bankTransferType = 'bank_to_paybill'
      result.amount = parseFloat(paybillMatch[1].replace(/,/g, ''))
      result.recipientNumber = paybillMatch[2] // Paybill number
      result.recipient = paybillMatch[3].trim() // Business/Account
      result.bankReference = paybillMatch[4]
      result.mpesaReference = paybillMatch[5]
      result.transactionCode = paybillMatch[5]
      result.success = true
      return result
    }

    // ===== Bank Debit Notification Pattern =====
    // "Your account 992****013 has been debited with KES 8,247.00 on 16/11/2025 at 17:29. Ref: FTX25320XAREM"
    const debitMatch = cleanMessage.match(/account\s*(\d{3}\*+\d{3})\s+has\s+been\s+debited\s+with\s+(?:KES|Ksh)\.?\s*([\d,]+(?:\.\d{2})?)\s+on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2})\.?\s*Ref:\s*(\w+)/i)
    if (debitMatch) {
      result.transactionType = 'bank_debit'
      result.accountNumber = debitMatch[1]
      result.amount = parseFloat(debitMatch[2].replace(/,/g, ''))
      result.date = debitMatch[3]
      result.time = debitMatch[4]
      result.bankReference = debitMatch[5]
      result.transactionCode = debitMatch[5]
      result.success = true
      return result
    }

    // ===== Legacy Bank Patterns (KCB, Equity, Co-op style) =====
    // Determine transaction type
    if (lowerMessage.includes('debited') || lowerMessage.includes('withdrawn')) {
      result.transactionType = 'debit'
      result.amount = amounts[0]

      const recipientMatch = cleanMessage.match(/(?:to|paid to)\s+([^.]+?)(?:\.|on|Bal)/i)
      if (recipientMatch) {
        result.recipient = recipientMatch[1].trim()
      }

    } else if (lowerMessage.includes('credited') || lowerMessage.includes('received')) {
      result.transactionType = 'credit'
      result.amount = amounts[0]

      const senderMatch = cleanMessage.match(/from\s+([^.]+?)(?:\.|on|Bal)/i)
      if (senderMatch) {
        result.recipient = senderMatch[1].trim()
      }

    } else if (lowerMessage.includes('transfer')) {
      result.transactionType = 'transfer'
      result.amount = amounts[0]

      if (lowerMessage.includes('charges')) {
        result.transactionCost = amounts[1]
        result.requiresManualFee = false
      }
    }

    // Extract reference/transaction ID
    const refMatch = cleanMessage.match(/(?:Ref|Reference|Txn|Transaction)[\s:.]*([\w\d]+)/i)
    if (refMatch) {
      result.transactionCode = refMatch[1].trim()
      result.bankReference = refMatch[1].trim()
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
 * Parse combined bank messages (both debit notification and M-Pesa confirmation)
 * Users often paste both messages together
 */
export function parseCombinedBankMessages(message) {
  const result = {
    success: false,
    transactionType: 'bank_transfer',
    bankTransferType: null,
    amount: null,
    transactionCost: null,
    recipient: null,
    recipientNumber: null,
    bankReference: null,
    mpesaReference: null,
    transactionCode: null,
    date: null,
    time: null,
    bankName: null,
    accountNumber: null,
    requiresManualFee: true,
    rawMessage: message
  }

  try {
    // Split by common separators (newlines, double spaces)
    const messages = message.split(/\n\n|\n/).filter(m => m.trim().length > 10)

    // Try to parse each part
    let debitInfo = null
    let transferInfo = null

    for (const msg of messages) {
      const parsed = parseBankMessage(msg.trim())

      if (parsed.success) {
        if (parsed.transactionType === 'bank_debit') {
          debitInfo = parsed
        } else if (parsed.bankTransferType) {
          transferInfo = parsed
        }
      }
    }

    // Combine information from both messages
    if (transferInfo) {
      // Transfer details take priority
      Object.assign(result, transferInfo)

      // Add debit info if available
      if (debitInfo) {
        result.date = result.date || debitInfo.date
        result.time = result.time || debitInfo.time
        result.accountNumber = result.accountNumber || debitInfo.accountNumber
        result.bankReference = result.bankReference || debitInfo.bankReference
      }

      result.success = true
    } else if (debitInfo) {
      // Only debit info available
      Object.assign(result, debitInfo)
      result.success = true
    }

  } catch (error) {
    console.error('Error parsing combined bank messages:', error)
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

  // Check for bank transfer patterns first (they contain M-Pesa keywords too)
  // NCBA style: "Till transfer", "MPESA transfer of KES", "BANK REF", "Go for it"
  const isBankTransfer =
    (cleanMessage.includes('till transfer') ||
     cleanMessage.includes('your mpesa transfer') ||
     cleanMessage.includes('bank ref') ||
     cleanMessage.includes('go for it') ||
     cleanMessage.includes('has been debited with'))

  if (isBankTransfer) {
    // Try combined parser first (handles both messages pasted together)
    const combinedResult = parseCombinedBankMessages(message)
    if (combinedResult.success) {
      return {
        ...combinedResult,
        provider: combinedResult.bankName || 'Bank'
      }
    }

    // Fall back to single message parser
    const bankResult = parseBankMessage(message)
    return {
      ...bankResult,
      provider: bankResult.bankName || 'Bank'
    }
  }

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

  // Bank to Till (NCBA style)
  bank_to_till: `Your account 992****013 has been debited with KES 8,247.00 on 16/11/2025 at 17:29. Ref: FTX25320XAREM. For queries, call 0711056444 / 0732156444 or WhatsApp: 0717804444.

Mpesa Till transfer of KES 8247 to 65575 Naivas Kitengela BANK REF. FTX25320XAREM MPESA REF. TKGSG4268Q was successful. NCBA, Go for it.`,

  // Bank to M-Pesa User (NCBA style)
  bank_to_mpesa: `Your account 992****013 has been debited with KES 15,000.00 on 24/12/2025 at 19:40. Ref: FTC251224PSAI. For queries, call 0711056444 / 0732156444 or WhatsApp: 0717804444.

Dear Kelvin Kipkoech, your MPESA transfer of KES. 15000.00 to Elizabeth Mukami Njue (254725084893) has been processed successfully. MPESA ref number TLO781XMO5. NCBA, Go for it.`,

  // Legacy bank formats
  kcb: "KCB: Acc XXX123 debited with Ksh3,500.00 on 23/12/24. Paid to CARREFOUR SUPERMARKET. Txn Ref: FTB8765432. Avail. Bal Ksh45,678.90.",

  equity: "Equity Bank: Your account 0123456789 has been credited with KES 25,000.00 from EMPLOYER NAME on 23Dec24. Ref: SAL123456. Balance: KES 67,890.00",

  coop: "Co-op Bank: KES 1,200.00 withdrawn from A/C ****5678 via ATM on 23/12/24. Transaction charges KES 35.00. Available Balance KES 23,456.00. Ref: ATM9876543"
}

export default {
  parseTransactionMessage,
  parseMpesaMessage,
  parseBankMessage,
  parseCombinedBankMessages,
  parseAirtelMoneyMessage,
  SAMPLE_MESSAGES
}
