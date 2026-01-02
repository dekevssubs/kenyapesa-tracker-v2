// tests/components/ResultsDisplay.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
// Update this path based on the actual location of ResultsDisplay.jsx
// e.g., if it's in src/components/common/ResultsDisplay.jsx, use:
// import ResultsDisplay from '../../src/components/common/ResultsDisplay';
// If it's in src/components/reports/ResultsDisplay.jsx, use:
// import ResultsDisplay from '../../src/components/reports/ResultsDisplay';
// For now, assuming it might be in the main components folder or a subfolder not explicitly listed:
// import ResultsDisplay from '../../src/components/ResultsDisplay'; // Adjust as needed

// Example assuming it might be in a nested structure based on other components
// Let's assume it's in a general components area if it's a shared component
// Check your actual file structure for the correct path.
// If it doesn't exist as a separate component file, this test might be irrelevant
// or need to be integrated into the Calculator.test.jsx if the display logic is there.
import ResultsDisplay from '../../src/components/reports/ResultsDisplay'; // Example path - UPDATE THIS

describe('ResultsDisplay Component', () => {
  const mockDeductions = {
    tax: 1000.50,
    nhif: 500,
    nssf: 3000,
    totalDeductions: 4500.50
  };

  it('renders all deduction details correctly', () => {
    render(
      <ResultsDisplay
        deductions={mockDeductions}
        grossSalary={50000}
        netSalary={45499.50}
      />
    );

    expect(screen.getByText(/gross salary/i)).toBeInTheDocument();
    expect(screen.getByText(/tax/i)).toBeInTheDocument();
    expect(screen.getByText(/nhif/i)).toBeInTheDocument();
    expect(screen.getByText(/nssf/i)).toBeInTheDocument();
    expect(screen.getByText(/total deductions/i)).toBeInTheDocument();
    expect(screen.getByText(/net salary/i)).toBeInTheDocument();

    expect(screen.getByText('KES 50,000.00')).toBeInTheDocument();
    expect(screen.getByText('KES 1,000.50')).toBeInTheDocument();
    expect(screen.getByText('KES 500.00')).toBeInTheDocument();
    expect(screen.getByText('KES 3,000.00')).toBeInTheDocument();
    expect(screen.getByText('KES 4,500.50')).toBeInTheDocument();
    expect(screen.getByText('KES 45,499.50')).toBeInTheDocument();
  });
});