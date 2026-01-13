// Email Templates for KenyaPesa Tracker

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #1f2937;
`

const buttonStyle = `
  display: inline-block;
  padding: 12px 24px;
  background-color: #059669;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  margin: 16px 0;
`

const containerStyle = `
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 20px;
  background-color: #ffffff;
`

const headerStyle = `
  text-align: center;
  margin-bottom: 32px;
`

const footerStyle = `
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  text-align: center;
  font-size: 12px;
  color: #6b7280;
`

export interface EmailTemplateData {
  userName?: string
  code?: string
  verificationUrl?: string
  billName?: string
  billAmount?: number
  daysOverdue?: number
  dueDate?: string
  category?: string
  budgetLimit?: number
  spent?: number
  percentage?: number
  goalName?: string
  targetAmount?: number
  achievedAmount?: number
  accountName?: string
  balance?: number
  threshold?: number
  weekStartDate?: string
  weekEndDate?: string
  totalExpenses?: number
  topCategory?: string
  budgetStatus?: string
  upcomingBillsCount?: number
  unsubscribeUrl?: string
  appUrl?: string
}

// OTP Login Email
export function otpLoginTemplate(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const { code, userName } = data

  return {
    subject: `Your KenyaPesa Login Code: ${code}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="${baseStyles}">
        <div style="${containerStyle}">
          <div style="${headerStyle}">
            <h1 style="color: #059669; margin: 0;">KenyaPesa</h1>
            <p style="color: #6b7280; margin: 8px 0 0 0;">Your Personal Finance Tracker</p>
          </div>

          <h2 style="margin-bottom: 16px;">Your Login Code</h2>

          <p>Hi${userName ? ` ${userName}` : ''},</p>

          <p>Your one-time login code is:</p>

          <div style="text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #059669; background: #ecfdf5; padding: 16px 24px; border-radius: 8px; display: inline-block;">
              ${code}
            </span>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            This code expires in <strong>10 minutes</strong>.
          </p>

          <p style="color: #6b7280; font-size: 14px;">
            If you didn't request this code, you can safely ignore this email.
          </p>

          <div style="${footerStyle}">
            <p>KenyaPesa Tracker</p>
            <p>This is an automated message. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Your KenyaPesa Login Code: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this code, you can safely ignore this email.`
  }
}

// Email Verification Template
export function verificationTemplate(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const { verificationUrl, userName } = data

  return {
    subject: 'Verify your KenyaPesa account',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="${baseStyles}">
        <div style="${containerStyle}">
          <div style="${headerStyle}">
            <h1 style="color: #059669; margin: 0;">KenyaPesa</h1>
            <p style="color: #6b7280; margin: 8px 0 0 0;">Your Personal Finance Tracker</p>
          </div>

          <h2 style="margin-bottom: 16px;">Welcome to KenyaPesa!</h2>

          <p>Hi${userName ? ` ${userName}` : ''},</p>

          <p>Thank you for signing up for KenyaPesa Tracker. Please verify your email address to complete your registration.</p>

          <div style="text-align: center;">
            <a href="${verificationUrl}" style="${buttonStyle}">Verify Email Address</a>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            This link expires in <strong>24 hours</strong>.
          </p>

          <p style="color: #6b7280; font-size: 14px;">
            If you didn't create an account, you can safely ignore this email.
          </p>

          <div style="${footerStyle}">
            <p>KenyaPesa Tracker</p>
            <p>This is an automated message. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Welcome to KenyaPesa!\n\nPlease verify your email by visiting: ${verificationUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't create an account, you can safely ignore this email.`
  }
}

// Bill Overdue Template
export function billOverdueTemplate(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const { billName, billAmount, daysOverdue, dueDate, appUrl, unsubscribeUrl } = data

  return {
    subject: `Overdue: ${billName} was due ${daysOverdue} days ago`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="${baseStyles}">
        <div style="${containerStyle}">
          <div style="${headerStyle}">
            <h1 style="color: #059669; margin: 0;">KenyaPesa</h1>
            <p style="color: #6b7280; margin: 8px 0 0 0;">Bill Reminder</p>
          </div>

          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <h2 style="color: #dc2626; margin: 0 0 8px 0;">Bill Overdue</h2>
            <p style="margin: 0; color: #7f1d1d;">Your bill requires immediate attention.</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Bill Name</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-align: right;">${billName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Amount</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-align: right;">KES ${billAmount?.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Due Date</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-align: right;">${dueDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Days Overdue</td>
              <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #dc2626;">${daysOverdue} days</td>
            </tr>
          </table>

          <div style="text-align: center;">
            <a href="${appUrl}/recurring" style="${buttonStyle}">View Bills</a>
          </div>

          <div style="${footerStyle}">
            <p>KenyaPesa Tracker</p>
            <p><a href="${unsubscribeUrl}" style="color: #6b7280;">Unsubscribe from bill reminders</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Bill Overdue: ${billName}\n\nAmount: KES ${billAmount?.toLocaleString()}\nDue Date: ${dueDate}\nDays Overdue: ${daysOverdue}\n\nView your bills at: ${appUrl}/recurring\n\nUnsubscribe: ${unsubscribeUrl}`
  }
}

// Budget Exceeded Template
export function budgetExceededTemplate(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const { category, budgetLimit, spent, percentage, appUrl, unsubscribeUrl } = data

  return {
    subject: `Budget Alert: ${category} exceeded (${percentage}%)`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="${baseStyles}">
        <div style="${containerStyle}">
          <div style="${headerStyle}">
            <h1 style="color: #059669; margin: 0;">KenyaPesa</h1>
            <p style="color: #6b7280; margin: 8px 0 0 0;">Budget Alert</p>
          </div>

          <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <h2 style="color: #b45309; margin: 0 0 8px 0;">Budget Exceeded</h2>
            <p style="margin: 0; color: #78350f;">Your ${category} budget has been exceeded.</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Category</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-align: right;">${category}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Budget Limit</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-align: right;">KES ${budgetLimit?.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Current Spending</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-align: right; color: #dc2626;">KES ${spent?.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Percentage Used</td>
              <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #dc2626;">${percentage}%</td>
            </tr>
          </table>

          <div style="text-align: center;">
            <a href="${appUrl}/budgets" style="${buttonStyle}">View Budgets</a>
          </div>

          <div style="${footerStyle}">
            <p>KenyaPesa Tracker</p>
            <p><a href="${unsubscribeUrl}" style="color: #6b7280;">Unsubscribe from budget alerts</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Budget Exceeded: ${category}\n\nBudget Limit: KES ${budgetLimit?.toLocaleString()}\nCurrent Spending: KES ${spent?.toLocaleString()}\nPercentage Used: ${percentage}%\n\nView your budgets at: ${appUrl}/budgets\n\nUnsubscribe: ${unsubscribeUrl}`
  }
}

// Goal Achieved Template
export function goalAchievedTemplate(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const { goalName, targetAmount, appUrl, unsubscribeUrl } = data

  return {
    subject: `Congratulations! Goal achieved: ${goalName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="${baseStyles}">
        <div style="${containerStyle}">
          <div style="${headerStyle}">
            <h1 style="color: #059669; margin: 0;">KenyaPesa</h1>
            <p style="color: #6b7280; margin: 8px 0 0 0;">Goal Achievement</p>
          </div>

          <div style="background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 8px;">🎉</div>
            <h2 style="color: #059669; margin: 0 0 8px 0;">Goal Achieved!</h2>
            <p style="margin: 0; color: #065f46;">Congratulations on reaching your financial goal!</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Goal Name</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-align: right;">${goalName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Target Amount</td>
              <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #059669;">KES ${targetAmount?.toLocaleString()}</td>
            </tr>
          </table>

          <div style="text-align: center;">
            <a href="${appUrl}/goals" style="${buttonStyle}">View Goals</a>
          </div>

          <div style="${footerStyle}">
            <p>KenyaPesa Tracker</p>
            <p><a href="${unsubscribeUrl}" style="color: #6b7280;">Unsubscribe from goal notifications</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Congratulations! Goal Achieved: ${goalName}\n\nTarget Amount: KES ${targetAmount?.toLocaleString()}\n\nView your goals at: ${appUrl}/goals\n\nUnsubscribe: ${unsubscribeUrl}`
  }
}

// Weekly Summary Template
export function weeklySummaryTemplate(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const {
    userName, weekStartDate, weekEndDate, totalExpenses,
    topCategory, budgetStatus, upcomingBillsCount, appUrl, unsubscribeUrl
  } = data

  return {
    subject: `Your KenyaPesa Weekly Summary (${weekStartDate} - ${weekEndDate})`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="${baseStyles}">
        <div style="${containerStyle}">
          <div style="${headerStyle}">
            <h1 style="color: #059669; margin: 0;">KenyaPesa</h1>
            <p style="color: #6b7280; margin: 8px 0 0 0;">Weekly Summary</p>
          </div>

          <h2 style="margin-bottom: 16px;">Hi${userName ? ` ${userName}` : ''}, here's your week in review</h2>

          <p style="color: #6b7280; margin-bottom: 24px;">${weekStartDate} - ${weekEndDate}</p>

          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 16px 0; color: #374151;">This Week's Highlights</h3>

            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280;">Total Expenses</span>
                </td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
                  KES ${totalExpenses?.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280;">Top Spending Category</span>
                </td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
                  ${topCategory || 'N/A'}
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280;">Budget Status</span>
                </td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
                  ${budgetStatus || 'On Track'}
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0;">
                  <span style="color: #6b7280;">Upcoming Bills</span>
                </td>
                <td style="padding: 12px 0; text-align: right; font-weight: 600;">
                  ${upcomingBillsCount || 0} bills
                </td>
              </tr>
            </table>
          </div>

          <div style="text-align: center;">
            <a href="${appUrl}/dashboard" style="${buttonStyle}">View Dashboard</a>
          </div>

          <div style="${footerStyle}">
            <p>KenyaPesa Tracker</p>
            <p><a href="${unsubscribeUrl}" style="color: #6b7280;">Unsubscribe from weekly summaries</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `KenyaPesa Weekly Summary (${weekStartDate} - ${weekEndDate})\n\nTotal Expenses: KES ${totalExpenses?.toLocaleString()}\nTop Category: ${topCategory || 'N/A'}\nBudget Status: ${budgetStatus || 'On Track'}\nUpcoming Bills: ${upcomingBillsCount || 0}\n\nView dashboard: ${appUrl}/dashboard\n\nUnsubscribe: ${unsubscribeUrl}`
  }
}

// Low Balance Warning Template
export function lowBalanceTemplate(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const { accountName, balance, threshold, appUrl, unsubscribeUrl } = data

  return {
    subject: `Low Balance Alert: ${accountName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="${baseStyles}">
        <div style="${containerStyle}">
          <div style="${headerStyle}">
            <h1 style="color: #059669; margin: 0;">KenyaPesa</h1>
            <p style="color: #6b7280; margin: 8px 0 0 0;">Balance Alert</p>
          </div>

          <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <h2 style="color: #b45309; margin: 0 0 8px 0;">Low Balance Warning</h2>
            <p style="margin: 0; color: #78350f;">Your account balance is below your set threshold.</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Account</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-align: right;">${accountName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Current Balance</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-align: right; color: #dc2626;">KES ${balance?.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Alert Threshold</td>
              <td style="padding: 8px 0; font-weight: 600; text-align: right;">KES ${threshold?.toLocaleString()}</td>
            </tr>
          </table>

          <div style="text-align: center;">
            <a href="${appUrl}/accounts" style="${buttonStyle}">View Accounts</a>
          </div>

          <div style="${footerStyle}">
            <p>KenyaPesa Tracker</p>
            <p><a href="${unsubscribeUrl}" style="color: #6b7280;">Unsubscribe from balance alerts</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Low Balance Alert: ${accountName}\n\nCurrent Balance: KES ${balance?.toLocaleString()}\nAlert Threshold: KES ${threshold?.toLocaleString()}\n\nView accounts: ${appUrl}/accounts\n\nUnsubscribe: ${unsubscribeUrl}`
  }
}

// Template selector function
export function getEmailTemplate(
  templateType: string,
  data: EmailTemplateData
): { subject: string; html: string; text: string } {
  switch (templateType) {
    case 'otp':
    case 'login':
      return otpLoginTemplate(data)
    case 'verification':
      return verificationTemplate(data)
    case 'bill_overdue':
      return billOverdueTemplate(data)
    case 'budget_exceeded':
      return budgetExceededTemplate(data)
    case 'goal_achieved':
      return goalAchievedTemplate(data)
    case 'weekly_summary':
      return weeklySummaryTemplate(data)
    case 'low_balance':
      return lowBalanceTemplate(data)
    default:
      throw new Error(`Unknown template type: ${templateType}`)
  }
}
