package com.churrasco.cup.common;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.Instant;

/**
 * Stores Instant values as epoch-millis (integer) in SQLite.
 *
 * Why: Hibernate's dialect writes Instant values as a number, but the sqlite-jdbc driver,
 * when reading them back with getTimestamp, tries to parse them as a date string and fails
 * ("Error parsing time stamp"). Converting to long avoids the driver's TIMESTAMP handling
 * entirely: getLong/setLong is used instead.
 *
 * autoApply = true -> applies to every Instant attribute across the entities.
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
