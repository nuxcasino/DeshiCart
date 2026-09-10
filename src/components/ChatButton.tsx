import Link from "next/link";

/** Floating Messenger chat button (bottom-right, above the cart drawer). */
export default function ChatButton() {
  return (
    <Link
      href="https://m.me/mdrashedulislam11"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on Messenger"
      title="Chat with us"
      className="fixed bottom-5 right-5 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-[#0084ff] p-3.5 text-white shadow-[0_8px_24px_rgba(0,132,255,0.45)] transition-transform hover:scale-105"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2C6.5 2 2 6.1 2 11.1c0 2.9 1.6 5.4 4 7.1V22l3.5-1.9c.8.2 1.6.3 2.5.3 5.5 0 10-4.1 10-9.1S17.5 2 12 2Zm1.1 12.3-2.6-2.8-5.1 2.8 5.6-6 2.7 2.8 5-2.8-5.6 6Z" />
      </svg>
    </Link>
  );
}
