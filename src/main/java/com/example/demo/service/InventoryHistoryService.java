package com.example.demo.service;

import org.springframework.stereotype.Service;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class InventoryHistoryService {
    public record HistoryRow(LocalDateTime createdAt, String productName, String sizeLabel, String type, int quantity, int stockBefore, int stockAfter) {}
    private static final DateTimeFormatter FMT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private final Path store = Paths.get("inventory-history.log");
    public synchronized void append(String productName, String sizeLabel, String type, int quantity, int stockBefore, int stockAfter) {
        String line = String.join("|", LocalDateTime.now().format(FMT), clean(productName), clean(sizeLabel), clean(type), String.valueOf(quantity), String.valueOf(stockBefore), String.valueOf(stockAfter)) + System.lineSeparator();
        try { Files.writeString(store, line, StandardCharsets.UTF_8, Files.exists(store) ? StandardOpenOption.APPEND : StandardOpenOption.CREATE); } catch (IOException ignored) {}
    }
    public synchronized List<HistoryRow> findAll() {
        if (!Files.exists(store)) return List.of();
        List<HistoryRow> rows = new ArrayList<>();
        try {
            for (String line : Files.readAllLines(store, StandardCharsets.UTF_8)) {
                String[] p = line.split("\\|", -1);
                if (p.length < 7) continue;
                rows.add(new HistoryRow(LocalDateTime.parse(p[0], FMT), p[1], p[2], p[3], toInt(p[4]), toInt(p[5]), toInt(p[6])));
            }
        } catch (Exception ignored) {}
        Collections.reverse(rows);
        return rows;
    }
    private int toInt(String v){ try{return Integer.parseInt(v);}catch(Exception e){return 0;} }
    private String clean(String v){ return v == null ? "-" : v.replace("|", "/").trim(); }
}
