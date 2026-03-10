use actix_web::{
    dev::{ forward_ready, Service, ServiceRequest, ServiceResponse, Transform },
    Error,
    HttpMessage,
    HttpResponse,
    http::header::HeaderMap,
};
use futures::future::LocalBoxFuture;
use std::future::{ ready, Ready };
use super::jwt::verify_token;

/// Authentication middleware struct.
/// Implements Transform to wrap services with JWT token validation.
#[derive(Clone)]
pub struct Auth;

/// Implementation of Transform for Auth middleware.
/// Creates AuthMiddleware instances to handle authentication.
impl<S, B> Transform<S, ServiceRequest>
    for Auth
    where
        S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
        S::Future: 'static,
        B: 'static
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = AuthMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AuthMiddleware { service }))
    }
}

/// AuthMiddleware wraps a service to perform JWT authentication.
/// Checks for valid Bearer tokens and injects claims into request extensions.
pub struct AuthMiddleware<S> {
    service: S,
}

/// Implementation of Service for AuthMiddleware.
/// Intercepts requests to validate JWT tokens before passing to the wrapped service.
impl<S, B> Service<ServiceRequest>
    for AuthMiddleware<S>
    where
        S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
        S::Future: 'static,
        B: 'static
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let token = extract_token_from_headers(req.headers());

        match token {
            None => {
                let response = HttpResponse::Unauthorized().body("Missing authorization token");
                Box::pin(async move {
                    Err(actix_web::error::ErrorUnauthorized("Missing authorization token"))
                })
            }
            Some(token_str) => {
                match verify_token(&token_str) {
                    Ok(claims) => {
                        req.extensions_mut().insert(claims);
                        let fut = self.service.call(req);
                        Box::pin(async move {
                            let res = fut.await?;
                            Ok(res)
                        })
                    }
                    Err(_) => {
                        let response = HttpResponse::Unauthorized().body(
                            "Invalid or expired token"
                        );
                        Box::pin(async move {
                            Err(actix_web::error::ErrorUnauthorized("Missing authorization token"))
                        })
                    }
                }
            }
        }
    }
}

/// Extracts the JWT token from the Authorization header.
/// Expects "Bearer <token>" format and returns the token string.
/// # Arguments
/// `headers` - The HTTP headers from the request.
/// # Returns
/// An Option containing the token string if present and valid, None otherwise.
fn extract_token_from_headers(headers: &HeaderMap) -> Option<String> {headers
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| {
            if h.starts_with("Bearer ") { Some(h[7..].to_string()) } else { None }
        })
}
