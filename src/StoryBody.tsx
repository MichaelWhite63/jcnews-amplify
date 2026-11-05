import { splitBody } from './djStory'

/** Article text: plain lines as before, <pre class="dj-fixed"> blocks as monospace with whitespace kept. */
export default function StoryBody({ text }: { text: string }) {
  return (
    <>
      {splitBody(text).map((seg, i) =>
        seg.kind === 'pre' ? (
          <pre key={i} className="dj-fixed">{seg.text}</pre>
        ) : (
          seg.text.split('\n').filter(line => line.trim()).map((line, j) => (
            <p key={`${i}-${j}`} className="story-para">{line}</p>
          ))
        )
      )}
    </>
  )
}
