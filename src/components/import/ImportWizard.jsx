import { useState, useRef } from 'react'
import { Upload, FileText, ArrowRight, ArrowLeft, Check, AlertTriangle, X, Download, RefreshCw } from 'lucide-react'

/**
 * CSV Import Wizard - Multi-step wizard for importing transactions from CSV
 */

const STEPS = [
  { id: 1, name: 'Upload', description: 'Select your CSV file' },
  { id: 2, name: 'Map Columns', description: 'Match columns to fields' },
  { id: 3, name: 'Preview', description: 'Review data before import' },
  { id: 4, name: 'Import', description: 'Import transactions' },
]

// Standard fields for expense/income imports
const FIELD_MAPPINGS = {
  expense: [
    { key: 'date', label: 'Date', required: true },
    { key: 'amount', label: 'Amount', required: true },
    { key: 'category', label: 'Category', required: false },
    { key: 'description', label: 'Description', required: false },
    { key: 'payment_method', label: 'Payment Method', required: false },
  ],
  income: [
    { key: 'date', label: 'Date', required: true },
    { key: 'amount', label: 'Amount', required: true },
    { key: 'source', label: 'Source', required: false },
    { key: 'source_name', label: 'Source Name', required: false },
    { key: 'description', label: 'Description', required: false },
  ],
}

export default function ImportWizard({
  isOpen,
  onClose,
  type = 'expense', // 'expense' | 'income'
  onImport
}) {
  const [currentStep, setCurrentStep] = useState(1)
  const [csvData, setCsvData] = useState(null)
  const [headers, setHeaders] = useState([])
  const [columnMapping, setColumnMapping] = useState({})
  const [previewData, setPreviewData] = useState([])
  const [validationErrors, setValidationErrors] = useState([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

  const fields = FIELD_MAPPINGS[type]

  const resetWizard = () => {
    setCurrentStep(1)
    setCsvData(null)
    setHeaders([])
    setColumnMapping({})
    setPreviewData([])
    setValidationErrors([])
    setImporting(false)
    setImportResult(null)
  }

  const handleClose = () => {
    resetWizard()
    onClose()
  }

  // Parse CSV file
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim())
    if (lines.length === 0) return { headers: [], rows: [] }

    // Detect delimiter (comma, semicolon, tab)
    const firstLine = lines[0]
    const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ','

    const parseRow = (line) => {
      const result = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }

    const headers = parseRow(lines[0])
    const rows = lines.slice(1).map(parseRow).filter(row => row.some(cell => cell))

    return { headers, rows }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const { headers, rows } = parseCSV(text)

      setHeaders(headers)
      setCsvData(rows)

      // Auto-map columns based on header names
      const autoMapping = {}
      fields.forEach(field => {
        const matchIndex = headers.findIndex(h =>
          h.toLowerCase().includes(field.key.toLowerCase()) ||
          field.key.toLowerCase().includes(h.toLowerCase())
        )
        if (matchIndex !== -1) {
          autoMapping[field.key] = matchIndex
        }
      })
      setColumnMapping(autoMapping)

      setCurrentStep(2)
    }
    reader.readAsText(file)
  }

  const handleColumnMap = (fieldKey, columnIndex) => {
    setColumnMapping(prev => ({
      ...prev,
      [fieldKey]: columnIndex === '' ? undefined : parseInt(columnIndex)
    }))
  }

  const validateData = () => {
    const errors = []
    const preview = csvData.slice(0, 100).map((row, rowIndex) => {
      const mapped = {}
      let hasError = false

      fields.forEach(field => {
        const colIndex = columnMapping[field.key]
        if (colIndex !== undefined && colIndex !== -1) {
          mapped[field.key] = row[colIndex] || ''
        } else if (field.required) {
          errors.push(`Row ${rowIndex + 1}: Missing required field "${field.label}"`)
          hasError = true
        }
      })

      // Validate date format
      if (mapped.date && isNaN(Date.parse(mapped.date))) {
        errors.push(`Row ${rowIndex + 1}: Invalid date format "${mapped.date}"`)
        hasError = true
      }

      // Validate amount is numeric
      if (mapped.amount) {
        const amount = parseFloat(mapped.amount.replace(/[^0-9.-]/g, ''))
        if (isNaN(amount)) {
          errors.push(`Row ${rowIndex + 1}: Invalid amount "${mapped.amount}"`)
          hasError = true
        }
        mapped.amount = amount
      }

      return { ...mapped, _hasError: hasError, _rowIndex: rowIndex }
    })

    setValidationErrors(errors.slice(0, 10)) // Show first 10 errors
    setPreviewData(preview)
    setCurrentStep(3)
  }

  const handleImport = async () => {
    setImporting(true)

    try {
      // Transform all data for import
      const dataToImport = csvData.map(row => {
        const mapped = {}
        fields.forEach(field => {
          const colIndex = columnMapping[field.key]
          if (colIndex !== undefined && colIndex !== -1) {
            let value = row[colIndex] || ''

            // Clean amount
            if (field.key === 'amount') {
              value = parseFloat(value.replace(/[^0-9.-]/g, '')) || 0
            }

            // Parse date
            if (field.key === 'date') {
              const parsed = new Date(value)
              value = !isNaN(parsed) ? parsed.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
            }

            mapped[field.key] = value
          }
        })
        return mapped
      }).filter(item => item.amount > 0) // Filter out invalid rows

      const result = await onImport(dataToImport)
      setImportResult(result)
      setCurrentStep(4)
    } catch (error) {
      setImportResult({ success: false, error: error.message })
      setCurrentStep(4)
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const headers = fields.map(f => f.label).join(',')
    const example = type === 'expense'
      ? '2024-01-15,1500,groceries,Weekly shopping,mpesa'
      : '2024-01-15,50000,salary,ACME Corp,Monthly salary'
    const csv = `${headers}\n${example}`

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}_import_template.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

        <div className="relative bg-[var(--bg-primary)] rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)]">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                Import {type === 'expense' ? 'Expenses' : 'Income'} from CSV
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].description}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-[var(--text-secondary)]" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : currentStep === step.id
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                  }`}>
                    {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
                  </div>
                  <span className={`ml-2 text-sm hidden sm:block ${
                    currentStep >= step.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                  }`}>
                    {step.name}
                  </span>
                  {index < STEPS.length - 1 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-[var(--border-primary)]'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[50vh]">
            {/* Step 1: Upload */}
            {currentStep === 1 && (
              <div className="text-center py-8">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[var(--border-primary)] rounded-xl p-12 cursor-pointer hover:border-[var(--accent-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <Upload className="h-16 w-16 text-[var(--text-muted)] mx-auto mb-4" />
                  <p className="text-lg font-medium text-[var(--text-primary)] mb-2">
                    Click to upload CSV file
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    or drag and drop your file here
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-center gap-4">
                  <button
                    onClick={downloadTemplate}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Template
                  </button>
                </div>

                <p className="text-xs text-[var(--text-muted)] mt-4">
                  Supports CSV files with comma, semicolon, or tab delimiters
                </p>
              </div>
            )}

            {/* Step 2: Column Mapping */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  Match your CSV columns to the required fields. We've auto-detected some mappings.
                </p>

                {fields.map(field => (
                  <div key={field.key} className="flex items-center gap-4">
                    <label className="w-32 text-sm font-medium text-[var(--text-primary)]">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <select
                      value={columnMapping[field.key] ?? ''}
                      onChange={(e) => handleColumnMap(field.key, e.target.value)}
                      className="flex-1 select"
                    >
                      <option value="">-- Don't import --</option>
                      {headers.map((header, index) => (
                        <option key={index} value={index}>
                          {header} (Column {index + 1})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                <div className="mt-6 p-4 bg-[var(--bg-tertiary)] rounded-lg">
                  <p className="text-sm font-medium text-[var(--text-primary)] mb-2">
                    Preview ({csvData?.length || 0} rows detected)
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[var(--border-primary)]">
                          {headers.slice(0, 5).map((h, i) => (
                            <th key={i} className="text-left py-2 px-2 text-[var(--text-secondary)]">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData?.slice(0, 3).map((row, i) => (
                          <tr key={i} className="border-b border-[var(--border-primary)]">
                            {row.slice(0, 5).map((cell, j) => (
                              <td key={j} className="py-2 px-2 text-[var(--text-primary)]">
                                {cell?.substring(0, 20) || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Preview & Validate */}
            {currentStep === 3 && (
              <div className="space-y-4">
                {validationErrors.length > 0 && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-200">
                          {validationErrors.length} validation warning(s)
                        </p>
                        <ul className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                          {validationErrors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border-primary)]">
                        <th className="text-left py-2 px-3 text-[var(--text-secondary)]">#</th>
                        {fields.map(field => (
                          <th key={field.key} className="text-left py-2 px-3 text-[var(--text-secondary)]">
                            {field.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 10).map((row, i) => (
                        <tr
                          key={i}
                          className={`border-b border-[var(--border-primary)] ${
                            row._hasError ? 'bg-red-50 dark:bg-red-900/10' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-[var(--text-muted)]">{row._rowIndex + 1}</td>
                          {fields.map(field => (
                            <td key={field.key} className="py-2 px-3 text-[var(--text-primary)]">
                              {row[field.key]?.toString()?.substring(0, 30) || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {previewData.length > 10 && (
                  <p className="text-sm text-[var(--text-muted)] text-center">
                    Showing 10 of {previewData.length} rows
                  </p>
                )}
              </div>
            )}

            {/* Step 4: Import Result */}
            {currentStep === 4 && (
              <div className="text-center py-8">
                {importing ? (
                  <>
                    <RefreshCw className="h-16 w-16 text-[var(--accent-primary)] mx-auto mb-4 animate-spin" />
                    <p className="text-lg font-medium text-[var(--text-primary)]">
                      Importing transactions...
                    </p>
                  </>
                ) : importResult?.success ? (
                  <>
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="h-8 w-8 text-green-500" />
                    </div>
                    <p className="text-lg font-medium text-[var(--text-primary)] mb-2">
                      Import Successful!
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {importResult.count || csvData?.length || 0} transactions imported successfully.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <X className="h-8 w-8 text-red-500" />
                    </div>
                    <p className="text-lg font-medium text-[var(--text-primary)] mb-2">
                      Import Failed
                    </p>
                    <p className="text-sm text-red-500">
                      {importResult?.error || 'An error occurred during import'}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
            <button
              onClick={currentStep === 1 ? handleClose : () => setCurrentStep(prev => prev - 1)}
              className="btn btn-secondary flex items-center gap-2"
              disabled={importing || currentStep === 4}
            >
              <ArrowLeft className="h-4 w-4" />
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </button>

            {currentStep === 4 ? (
              <button
                onClick={handleClose}
                className="btn btn-primary flex items-center gap-2"
              >
                Done
              </button>
            ) : currentStep === 3 ? (
              <button
                onClick={handleImport}
                className="btn btn-primary flex items-center gap-2"
                disabled={importing || validationErrors.length > 0}
              >
                Import {csvData?.length || 0} Rows
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : currentStep === 2 ? (
              <button
                onClick={validateData}
                className="btn btn-primary flex items-center gap-2"
                disabled={!Object.values(columnMapping).some(v => v !== undefined)}
              >
                Preview Data
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
