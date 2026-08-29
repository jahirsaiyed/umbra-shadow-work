import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DailyCheckInForm } from './DailyCheckInForm'

describe('DailyCheckInForm', () => {
  it('shows a confirmation after a successful check-in and disables the button', async () => {
    const submit = vi.fn().mockResolvedValue({ safetyFlagged: false, newBadges: [], growthStage: 'seed' })
    render(<DailyCheckInForm prompt="How was today?" onSubmit={submit} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A calm day.' } })
    const button = screen.getByRole('button', { name: /check in/i })
    fireEvent.click(button)

    await waitFor(() => expect(screen.getByText(/thanks for checking in today/i)).toBeInTheDocument())
    expect(button).toBeDisabled()

    fireEvent.click(button)
    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('shows a calm retry-able error and re-enables the button when the submit action throws', async () => {
    const submit = vi.fn().mockRejectedValue(new Error('insert failed'))
    render(<DailyCheckInForm prompt="How was today?" onSubmit={submit} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Something I wrote.' } })
    const button = screen.getByRole('button', { name: /check in/i })
    fireEvent.click(button)

    await waitFor(() => expect(screen.getByText(/couldn't save/i)).toBeInTheDocument())
    expect(button).not.toBeDisabled()
    expect(screen.getByRole('textbox')).toHaveValue('Something I wrote.')
    expect(screen.queryByText(/thanks for checking in today/i)).not.toBeInTheDocument()
  })
})
