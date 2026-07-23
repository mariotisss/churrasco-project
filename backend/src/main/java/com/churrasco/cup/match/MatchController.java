package com.churrasco.cup.match;

import com.churrasco.cup.edition.dto.EditionDetailDto;
import com.churrasco.cup.match.dto.MatchResultRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
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
     * Records a match result. Returns the full edition detail so the frontend can
     * repaint the whole bracket in one go.
     */
    @PutMapping("/{id}/result")
    public EditionDetailDto recordResult(@PathVariable Long id,
                                         @Valid @RequestBody MatchResultRequest request) {
        return service.recordResult(id, request);
    }

    /**
     * Clears a match result, reverting it to "not played" (never left as a 0-0 draw).
     * Returns the full edition detail so the frontend can repaint the bracket.
     */
    @DeleteMapping("/{id}/result")
    public EditionDetailDto clearResult(@PathVariable Long id) {
        return service.clearResult(id);
    }
}
