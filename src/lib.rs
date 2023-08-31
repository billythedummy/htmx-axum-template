use axum::{
    http::StatusCode,
    response::Html,
    routing::{get, post},
    Form, Router,
};
use lazy_static::lazy_static;
use minijinja::{path_loader, Environment};
use minijinja_autoreload::AutoReloader;
use serde::{Deserialize, Serialize};
use tower_http::{
    compression::Compression,
    services::{ServeDir, ServeFile},
    trace::{DefaultMakeSpan, DefaultOnResponse, TraceLayer},
};
use tracing::Level;

pub const TEMPLATE_PATH: &str = "app/templates";

lazy_static! {
    pub static ref TEMPLATES: AutoReloader = {
        AutoReloader::new(|notifier| {
            let mut env = Environment::new();
            env.set_loader(path_loader(TEMPLATE_PATH));
            notifier.watch_path(TEMPLATE_PATH, true);
            Ok(env)
        })
    };
}

pub async fn main() {
    tracing_subscriber::fmt()
        .with_target(false)
        .compact()
        .init();

    let static_files = Compression::new(
        ServeDir::new("app") // if no files found, check your pwd to make sure it's at project root
            .fallback(ServeFile::new("app/404.html")),
    );

    let app = Router::new()
        .route("/", get(home))
        .route("/index/name", post(name))
        .fallback_service(static_files)
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(DefaultMakeSpan::new().level(Level::INFO))
                .on_response(DefaultOnResponse::new().level(Level::INFO)),
        );

    axum::Server::bind(&"0.0.0.0:3000".parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}

pub async fn home() -> axum::response::Result<Html<String>> {
    let env = TEMPLATES.acquire_env().unwrap();
    let template = env.get_template("index.html").unwrap();
    let html = template
        .render(())
        .map_err(|_| StatusCode::from_u16(500).unwrap())?;
    Ok(html.into())
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Name {
    pub name: String,
}

pub async fn name(Form(mut name): Form<Name>) -> axum::response::Result<Html<String>> {
    name.name = ammonia::clean(&name.name);
    let env = TEMPLATES.acquire_env().unwrap();
    let template = env.get_template("name.html").unwrap();
    let html = template
        .render(&name)
        .map_err(|_| StatusCode::from_u16(500).unwrap())?;
    Ok(html.into())
}
