package com.example.demo.repository;

import com.example.demo.model.Address;
import com.example.demo.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AddressRepository extends JpaRepository<Address, Long> {
    List<Address> findByUserOrderByIdDesc(UserAccount user);
    Optional<Address> findFirstByUserAndIsDefaultTrue(UserAccount user);
}
