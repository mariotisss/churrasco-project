package com.churrasco.cup.edition;

import com.churrasco.cup.edition.dto.CreateEditionRequest;
import com.churrasco.cup.edition.dto.DrawRequest;
import com.churrasco.cup.edition.dto.EditionDetailDto;
import com.churrasco.cup.edition.dto.EditionSummaryDto;
import com.churrasco.cup.edition.dto.StandingRowDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/editions")
public class EditionController {

    private final EditionService service;

    public EditionController(EditionService service) {
        this.service = service;
    }

    @GetMapping
    public List<EditionSummaryDto> list() {
        return service.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EditionSummaryDto create(@Valid @RequestBody CreateEditionRequest request) {
        return service.create(request);
    }

    @GetMapping("/{id}")
    public EditionDetailDto getDetail(@PathVariable Long id) {
        return service.getDetail(id);
    }

    /** Draws (or re-draws) the teams and generates the schedule. */
    @PostMapping("/{id}/draw")
    public EditionDetailDto draw(@PathVariable Long id,
                                 @RequestBody(required = false) DrawRequest request) {
        return service.draw(id, request);
    }

    @GetMapping("/{id}/standings")
    public List<StandingRowDto> standings(@PathVariable Long id) {
        return service.getStandings(id);
    }

    /** Deletes a sandbox edition (only test editions can be removed). */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
