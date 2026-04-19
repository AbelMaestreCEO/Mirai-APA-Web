// functions/api/[[...route]].js

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // Solo manejar rutas API
    if (!path.startsWith('/api/')) {
        return new Response('Not Found', { status: 404 });
    }

    // Importar tu lógica de Worker
    // Nota: En Functions, las rutas son diferentes a Workers standalone
    // Necesitas importar tu lógica de routes.js
    
    try {
        // Importar handlers de routes
        const { getRouteHandler, getCorsHeaders } = await import('./routes.js');
        
        const corsHeaders = getCorsHeaders('https://format.aberumirai.com');
        const method = request.method;

        // Buscar handler
        const route = getRouteHandler(path, method);

        if (!route) {
            return new Response(JSON.stringify({ error: 'Not Found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Ejecutar handler
        const response = await route.handler(env, request, corsHeaders, route.params.fileId);
        return response;

    } catch (error) {
        console.error('Function error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}