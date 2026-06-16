package com.churrasco.cup.common;

/** Peticion invalida segun reglas de negocio -> HTTP 400. */
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}
