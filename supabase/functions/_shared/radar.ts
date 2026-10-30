/** Predicado único de tema Radar (RN11): a view `torre_radar_themes` = tarefa ativa com a etiqueta Radar. */
export async function radarThemeIds(db:any,uid:string):Promise<string[]>{
 const {data,error}=await db.from('torre_radar_themes').select('task_id').eq('user_id',uid).limit(5000);
 if(error)throw new Error('Não foi possível acessar os dados da Torre.');
 return (data??[]).map((row:{task_id:string})=>row.task_id);
}
/** Filtro PostgREST `not.in` para excluir os temas; vazio quando não há temas. */
export const notInThemes=(ids:string[])=>`(${ids.join(',')})`;
