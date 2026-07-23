import ROUTES from './routes';

export const headers = new Headers({
  'Access-Control-Allow-Origin': ROUTES.ORIGIN,
  'Access-Control-Allow-Method': '*',
  'Access-Control-Allow-Headers': 'Access-Control-Allow-Origin, Access-Control-Allow-Credentials, access-control-allow-method',
  'Content-Type': 'application/json'
});

export const getResource = (route:string) => 
  new Request(route, {
    method: 'get',
    headers
  });

export function postResource<T>(route:string, body: T) {
  return new Request(
    route, 
    {
      method: 'post',
      headers,
      body: JSON.stringify(body)
    }
  );
}

export function putResource<T>(route:string, body: T){
  console.log("PUT Resource:", route, headers, body);
  return new Request(
    route, 
    {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    }
  );
} 

export function deleteResource<T>(route:string, body: T){
  return new Request(
    route,
    {
      method: 'DELETE',
      headers,
      body: JSON.stringify(body),
    }
  );
}
export async function fetchResource<T> (
  request:Request, 
  requestInit?: RequestInit | undefined
): Promise<T> {  
    const response = await fetch(request, requestInit);
    const result = await response.json();
    console.groupCollapsed(`Fetch Resource ${request.url}}`);
    console.log( request);
    console.log("Request Init:", requestInit);
    console.log(response);
    console.log("Result:", result);
    console.groupEnd();
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      console.error(`Failed to fetch resource: ${response.status}`, body);
      throw new Error(body.error ?? `Failed to fetch resource: ${response.status}`);
    }
    return result as T;
};
