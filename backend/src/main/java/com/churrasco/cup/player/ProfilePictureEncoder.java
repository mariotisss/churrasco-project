package com.churrasco.cup.player;

import com.churrasco.cup.common.BadRequestException;
import org.springframework.stereotype.Component;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;

/**
 * Turns whatever a browser sends into the one shape the app stores: a square JPEG of
 * {@value #SIDE}px. Re-encoding is not only about size -- it is what guarantees the
 * bytes we later serve really are an image (and not, say, a script with an image name),
 * and it drops any EXIF the phone put in there along the way.
 */
@Component
public class ProfilePictureEncoder {

    /**
     * Circles are 64px at most in the UI, but any face can be opened full size in the
     * photo viewer (~350px on a high-density screen), so 512 is what keeps that crisp.
     * Pictures uploaded before this stay at their original 256: still fine, just softer.
     */
    private static final int SIDE = 512;

    private static final float QUALITY = 0.85f;

    /** Behind any transparency, matching the app's dark panels. */
    private static final Color BACKDROP = new Color(0x1c, 0x1c, 0x20);

    public byte[] toSquareJpeg(byte[] uploaded) {
        BufferedImage source = read(uploaded);

        // Center-crop to a square first, so scaling never distorts faces.
        int side = Math.min(source.getWidth(), source.getHeight());
        int x = (source.getWidth() - side) / 2;
        int y = (source.getHeight() - side) / 2;
        BufferedImage cropped = source.getSubimage(x, y, side, side);

        BufferedImage square = new BufferedImage(SIDE, SIDE, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = square.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                    RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            // JPEG has no alpha: fill first so transparent PNGs don't come out black.
            g.setColor(BACKDROP);
            g.fillRect(0, 0, SIDE, SIDE);
            g.drawImage(cropped, 0, 0, SIDE, SIDE, null);
        } finally {
            g.dispose();
        }

        return writeJpeg(square);
    }

    private BufferedImage read(byte[] uploaded) {
        BufferedImage image;
        try {
            image = ImageIO.read(new ByteArrayInputStream(uploaded));
        } catch (IOException e) {
            throw new BadRequestException("No se ha podido leer la imagen");
        }
        if (image == null) {
            throw new BadRequestException("El archivo no es una imagen válida (usa JPG, PNG, GIF o BMP)");
        }
        return image;
    }

    private byte[] writeJpeg(BufferedImage image) {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
        if (!writers.hasNext()) {
            throw new IllegalStateException("No JPEG writer available");
        }
        ImageWriter writer = writers.next();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ImageOutputStream stream = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(stream);
            ImageWriteParam params = writer.getDefaultWriteParam();
            params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            params.setCompressionQuality(QUALITY);
            writer.write(null, new IIOImage(image, null, null), params);
        } catch (IOException e) {
            throw new IllegalStateException("No se ha podido codificar la imagen", e);
        } finally {
            writer.dispose();
        }
        return out.toByteArray();
    }
}
