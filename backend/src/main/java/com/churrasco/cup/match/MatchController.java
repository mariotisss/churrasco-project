package com.churrasco.cup.match;

import com.churrasco.cup.edition.dto.EditionDetailDto;
import com.churrasco.cup.match.dto.MatchResultRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/matches")
public class MatchController {

    private final MatchService service;

    public MatchController(MatchService service) {
        this.service = service;
    }

    /**
     * Anota el resultado de un partido. Devuelve el detalle completo de la edicion
     * para que el frontend repinte el cuadro de una sola vez.
     */
    @PutMapping("/{id}/result")
    public EditionDetailDto recordResult(@PathVariable Long id,
                                         @Valid @RequestBody MatchResultRequest request) {
        return service.recordResult(id, request);
    }
}
