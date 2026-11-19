import type { ReactNode } from 'react';

interface EditorMessageProps {
  text: string;
  children: ReactNode;
}

export const EditorMessage = ({ text, children }: EditorMessageProps) => (
  <div role="alert" className="flex flex-col items-start gap-4 border border-line bg-panel px-6 py-8">
    <p className="text-lg">{text}</p>
    {children}
  </div>
);
