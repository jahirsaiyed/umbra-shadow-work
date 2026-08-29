interface EarnedBadge {
  id: string
  name: string
  description: string
}

export function BadgeGrid({ badges }: { badges: EarnedBadge[] }) {
  if (badges.length === 0) {
    return <p className="text-stone-600">No badges yet — they'll appear here as you go.</p>
  }
  return (
    <ul className="grid grid-cols-2 gap-4">
      {badges.map((badge) => (
        <li key={badge.id} className="rounded border border-stone-200 p-3">
          <p className="font-medium">{badge.name}</p>
          <p className="text-sm text-stone-600">{badge.description}</p>
        </li>
      ))}
    </ul>
  )
}
