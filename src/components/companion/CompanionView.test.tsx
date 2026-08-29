import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CompanionView } from './CompanionView'

describe('CompanionView', () => {
  it('shows an encouraging label for each growth stage without ever showing a penalty', () => {
    render(<CompanionView growthStage="seed" currentStreak={0} />)
    expect(screen.getByText(/seedling/i)).toBeInTheDocument()
    expect(screen.queryByText(/broken/i)).not.toBeInTheDocument()
  })

  it('shows the current streak count when greater than zero', () => {
    render(<CompanionView growthStage="sprout" currentStreak={4} />)
    expect(screen.getByText(/4/)).toBeInTheDocument()
  })

  it('shows gentle copy instead of a number when the streak is zero', () => {
    render(<CompanionView growthStage="seed" currentStreak={0} />)
    expect(screen.getByText(/whenever you're ready/i)).toBeInTheDocument()
  })
})
