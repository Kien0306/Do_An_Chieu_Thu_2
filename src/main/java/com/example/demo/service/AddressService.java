package com.example.demo.service;

import com.example.demo.model.Address;
import com.example.demo.model.UserAccount;
import com.example.demo.repository.AddressRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class AddressService {
    private final AddressRepository addressRepository;
    private final UserRepository userRepository;

    public AddressService(AddressRepository addressRepository, UserRepository userRepository) {
        this.addressRepository = addressRepository;
        this.userRepository = userRepository;
    }

    public List<Address> list(String username) {
        return userRepository.findByUsername(username).map(addressRepository::findByUserOrderByIdDesc).orElse(List.of());
    }

    public Optional<Address> defaultAddress(String username) {
        return userRepository.findByUsername(username).flatMap(addressRepository::findFirstByUserAndIsDefaultTrue);
    }

    @Transactional
    public void saveOrUpdateDefault(String username, String fullName, String phone, String addressText) {
        UserAccount user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return;
        Address address = addressRepository.findFirstByUserAndIsDefaultTrue(user).orElseGet(Address::new);
        address.setUser(user);
        address.setFullName(fullName);
        address.setPhone(phone);
        address.setAddress(addressText);
        address.setDefault(true);
        addressRepository.save(address);
    }
}
