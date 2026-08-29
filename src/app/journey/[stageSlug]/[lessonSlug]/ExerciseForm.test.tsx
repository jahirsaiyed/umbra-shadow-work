import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExerciseForm } from './ExerciseForm'

describe('ExerciseForm', () => {
  it('shows a normal confirmation when the entry is not safety-flagged', async () => {
    const submit = vi.fn().mockResolvedValue({ safetyFlagged: false, newBadges: [], growthStage: 'seed' })
    render(<ExerciseForm stageSlug="recognition" lessonSlug="noticing-triggers" onSubmit={submit} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A calm reflection.' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(screen.getByText(/entry saved/i)).toBeInTheDocument())
    expect(screen.queryByText(/might be a good time to talk to someone/i)).not.toBeInTheDocument()
  })

  it('shows the gentle safety pathway, without blocking, when the entry is flagged', async () => {
    const submit = vi.fn().mockResolvedValue({ safetyFlagged: true, newBadges: [], growthStage: 'seed' })
    render(<ExerciseForm stageSlug="recognition" lessonSlug="noticing-triggers" onSubmit={submit} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a flagged entry' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(screen.getByText(/might be a good time to talk to someone/i)).toBeInTheDocument())
    expect(screen.getByText(/entry saved/i)).toBeInTheDocument()
  })
})
