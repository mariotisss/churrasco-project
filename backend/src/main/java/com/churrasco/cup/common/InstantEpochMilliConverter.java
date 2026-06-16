package com.churrasco.cup.common;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.Instant;

/**
 * Guarda los Instant como epoch-millis (entero) en SQLite.
 *
 * Motivo: el dialecto de Hibernate escribe los Instant como numero, pero el driver
 * sqlite-jdbc, al releerlos con getTimestamp, intenta parsearlos como texto de fecha y
 * falla ("Error parsing time stamp"). Convirtiendo a long evitamos por completo el manejo
 * de TIMESTAMP del driver: se usa getLong/setLong.
 *
 * autoApply = true -> se aplica a todos los atributos Instant de las entidades.
 */
@Converter(autoApply = true)
public class InstantEpochMilliConverter implements AttributeConverter<Instant, Long> {

    @Override
    public Long convertToDatabaseColumn(Instant attribute) {
        return attribute == null ? null : attribute.toEpochMilli();
    }

    @Override
    public Instant convertToEntityAttribute(Long dbData) {
        return dbData == null ? null : Instant.ofEpochMilli(dbData);
    }
}
