import { useEffect, useRef, type ReactNode } from 'react';
import { AlertCircle, ArrowRight, LoaderCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="error-notice" role="alert"><AlertCircle size={18}/><span>{message}</span>{retry && <button className="text-button" onClick={retry}>Try again</button>}</div>;
}
export function Loading({ text = 'Loading your workspace…' }: { text?: string }) { return <div className="loading" role="status"><LoaderCircle className="spin" size={24}/>{text}</div>; }
export function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</header>;
}
export function NewSessionLink() { return <Link className="button primary" to="/new">New session <ArrowRight size={17}/></Link>; }
export function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; const previous = document.activeElement as HTMLElement; element?.showModal(); return () => { element?.close(); previous?.focus(); }; }, []);
  return <dialog ref={dialog} className="modal" aria-labelledby="modal-title" onCancel={e => { e.preventDefault(); close(); }}><div className="modal-heading"><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={close}><X size={20}/></button></div>{children}</dialog>;
}
