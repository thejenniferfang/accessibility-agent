"use client";

import { useState, useEffect } from "react";

const phrases = [
  "Finds websites",
  "Scans them for accessibility issues",
  "Converts violations into clear engineering tickets",
  "Notifies the site owner with actionable fixes"
];

export default function TypewriterLoop() {
  const [index, setIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    const currentPhrase = phrases[index];
    const typeSpeed = isDeleting ? 30 : 50;
    const deleteDelay = 2000; // Time to wait before deleting
    const nextPhraseDelay = 500; // Time to wait before typing next phrase

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (displayText.length < currentPhrase.length) {
          setDisplayText(currentPhrase.slice(0, displayText.length + 1));
        } else {
          // Finished typing, wait then delete
          setTimeout(() => setIsDeleting(true), deleteDelay);
        }
      } else {
        // Deleting
        if (displayText.length > 0) {
          setDisplayText(currentPhrase.slice(0, displayText.length - 1));
        } else {
          // Finished deleting, move to next phrase
          setIsDeleting(false);
          setIndex((prev) => (prev + 1) % phrases.length);
        }
      }
    }, typeSpeed);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, index]);

  return (
    <div className="h-8 flex items-center justify-center">
      <span className="text-xl md:text-2xl text-white font-light tracking-wide">
        {displayText}
        <span className="animate-pulse ml-1">|</span>
      </span>
    </div>
  );
}
