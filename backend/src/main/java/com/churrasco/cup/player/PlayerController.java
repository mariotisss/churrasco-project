package com.churrasco.cup.player;

import com.churrasco.cup.player.dto.CreatePlayerRequest;
import com.churrasco.cup.player.dto.PlayerDto;
import com.churrasco.cup.player.dto.PlayerStandingDto;
import com.churrasco.cup.player.dto.UpdatePlayerRequest;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/api/players")
public class PlayerController {

    private final PlayerService service;

    public PlayerController(PlayerService service) {
        this.service = service;
    }

    @GetMapping
    public List<PlayerDto> list(@RequestParam(defaultValue = "false") boolean activeOnly) {
        return service.list(activeOnly);
    }

    /** All-time player ranking (champion = 2 pts, runner-up = 1 pt per edition). */
    @GetMapping("/standings")
    public List<PlayerStandingDto> standings() {
        return service.standings();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PlayerDto create(@Valid @RequestBody CreatePlayerRequest request) {
        return service.create(request);
    }

    @PatchMapping("/{id}")
    public PlayerDto update(@PathVariable Long id, @Valid @RequestBody UpdatePlayerRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    /**
     * The player's profile picture. Immutable for caching purposes: the URL carries a
     * {@code ?v=<photoVersion>} that changes whenever the picture does, so clients can
     * hold on to it for a year and still never show a stale face.
     */
    @GetMapping("/{id}/photo")
    public ResponseEntity<byte[]> photo(@PathVariable Long id) {
        return service.photo(id)
                .map(image -> ResponseEntity.ok()
                        .contentType(MediaType.IMAGE_JPEG)
                        .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                        .body(image))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/photo")
    public PlayerDto uploadPhoto(@PathVariable Long id, @RequestParam("file") MultipartFile file)
            throws IOException {
        return service.setPhoto(id, file.getBytes());
    }

    @DeleteMapping("/{id}/photo")
    public PlayerDto deletePhoto(@PathVariable Long id) {
        return service.deletePhoto(id);
    }
}
