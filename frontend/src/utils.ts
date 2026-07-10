import ROUTES from './routes';

export async function fetchResource<T>(request:Request, requestInit?: RequestInit | undefined): Promise<T> {
  try {
    const response = await fetch(request, requestInit);
    const result = await response.json();
    console.groupCollapsed(`Fetch Resource ${request.url}}`);
    console.log( request);
    console.log("Request Init:", requestInit);
    console.log(response);
    console.log("Result:", result);
    console.groupEnd();
    return result as T;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
export const headers = new Headers({
  'Access-Control-Allow-Origin': ROUTES.ORIGIN,
  'Access-Control-Allow-Method': '*',
  'Access-Control-Allow-Headers': 'Access-Control-Allow-Origin, Access-Control-Allow-Credentials, access-control-allow-method'
});

export const getResource = (route:string) => new Request(route, {
  method: 'get',
  headers
});