package com.churrasco.cup.penalty;

import com.churrasco.cup.penalty.dto.CreatePenaltyRequest;
import com.churrasco.cup.penalty.dto.PenaltyDto;
import com.churrasco.cup.penalty.dto.UpdatePenaltyRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/penalties")
public class PenaltyController {

    private final PenaltyService service;

    public PenaltyController(PenaltyService service) {
        this.service = service;
    }

    /** Penalties history, newest first. */
    @GetMapping
    public List<PenaltyDto> list() {
        return service.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PenaltyDto create(@Valid @RequestBody CreatePenaltyRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public PenaltyDto update(@PathVariable Long id, @Valid @RequestBody UpdatePenaltyRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
