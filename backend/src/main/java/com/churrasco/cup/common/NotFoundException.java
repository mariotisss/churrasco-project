package com.churrasco.cup.common;

/** Recurso inexistente -> HTTP 404. */
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
