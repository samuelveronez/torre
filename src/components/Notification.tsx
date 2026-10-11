import type {ReactNode} from 'react';
import './notification.css';

export function Notification({message,actions,placement='bottom'}:{message:string;actions?:ReactNode;placement?:'top'|'bottom'}){
 return <div className={`torre-notification-region notification-${placement}`} role="status" aria-live="polite" aria-atomic="true">{message&&<div className="torre-notification"><span>{message}</span>{actions&&<div className="notification-actions">{actions}</div>}</div>}</div>;
}
