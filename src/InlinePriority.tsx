import {TaskActionMenu} from './TaskActionMenu';
import type {Task} from './task';
export {PriorityContext} from './priorityContext';
export function InlinePriority({task}:{task:Task}){return <TaskActionMenu task={task}/>;}
