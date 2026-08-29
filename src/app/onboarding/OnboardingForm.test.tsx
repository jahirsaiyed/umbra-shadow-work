import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OnboardingForm } from './OnboardingForm'

describe('OnboardingForm', () => {
  it('disables submit until all three questions are answered', () => {
    render(<OnboardingForm action={vi.fn()} />)
    const submit = screen.getByRole('button', { name: /continue/i }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)

    fireEvent.click(screen.getByLabelText(/new to this/i))
    fireEvent.click(screen.getByLabelText(/moderate/i))
    fireEvent.click(screen.getByLabelText(/a recurring trigger/i))

    expect(submit.disabled).toBe(false)
  })
})
