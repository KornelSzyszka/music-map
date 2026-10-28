import { MAX_HIGHLIGHTED_GENRES } from '../../state/featureGraphState'

interface Props {
  genres: readonly string[]
  highlighted: readonly string[]
  onToggle: (genre: string) => void
}

/** Genre filter chips; the first three highlighted genres get the first three series colours. */
export default function GenreChips({ genres, highlighted, onToggle }: Props) {
  return (
    <div className="chips" role="group" aria-label={`Highlighted genres (up to ${MAX_HIGHLIGHTED_GENRES})`}>
      {genres.map((genre) => {
        const slot = highlighted.indexOf(genre)
        return (
          <button
            key={genre}
            type="button"
            className="chip chip-small"
            aria-pressed={slot >= 0}
            onClick={() => onToggle(genre)}
          >
            {slot >= 0 ? <span className={`swatch series-bg-${slot + 1}`} aria-hidden="true" /> : null}
            {genre}
          </button>
        )
      })}
    </div>
  )
}
